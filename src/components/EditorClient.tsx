"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import Editor from "@monaco-editor/react";
import { ref as dbRef, onValue, set, remove, onDisconnect } from "firebase/database";
import { db } from "@/lib/firebase";
import { useAuth } from "@/components/AuthProvider";
import { AlertTriangle, Play, Loader2 } from "lucide-react";
import TerminalOutput, { type TerminalLog } from "@/components/TerminalOutput";
import { submitPythonCode } from "@/lib/piston";

interface EditorClientProps {
    roomCode: string;
    isHost: boolean;
    onMountEditor?: (editor: any) => void;
    avatar: string;
}

export default function EditorClient({ roomCode, isHost, onMountEditor, avatar }: EditorClientProps) {
    const { user } = useAuth();

    const myEditorRef = useRef<any>(null);
    const opponentEditorRef = useRef<any>(null);
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [opponentAvatar, setOpponentAvatar] = useState<string>("❓");
    const [opponentName, setOpponentName] = useState<string>("Waiting...");
    const [opponentOnline, setOpponentOnline] = useState(false);
    const [opponentMounted, setOpponentMounted] = useState(false);
    const [antiCheatVisible, setAntiCheatVisible] = useState(false);
    const [rtdbWriteError, setRtdbWriteError] = useState(false);
    const [terminalLogs, setTerminalLogs] = useState<TerminalLog[]>([]);
    const [isRunning, setIsRunning] = useState(false);

    const myRole = isHost ? "host" : "guest";
    const opponentRole = isHost ? "guest" : "host";

    // ── 1. Publish own player info ───────────────────────────────────────────
    useEffect(() => {
        if (!roomCode || !user) return;
        set(dbRef(db, `rooms/${roomCode}/players/${myRole}`), {
            avatar,
            name: user.displayName || "Anonymous",
            uid: user.uid,
            online: true,
        }).catch(() => setRtdbWriteError(true));
    }, [roomCode, myRole, avatar, user]);

    // ── 1b. Auto-cleanup on disconnect ───────────────────────────────────────
    useEffect(() => {
        if (!roomCode || !user) return;
        if (isHost) {
            const roomRef = dbRef(db, `rooms/${roomCode}`);
            onDisconnect(roomRef).remove();
            return () => { onDisconnect(roomRef).cancel(); };
        } else {
            const onlineRef = dbRef(db, `rooms/${roomCode}/players/${myRole}/online`);
            onDisconnect(onlineRef).set(false);
            return () => { onDisconnect(onlineRef).cancel(); };
        }
    }, [roomCode, myRole, isHost, user]);

    // ── 2. Subscribe to opponent info ────────────────────────────────────────
    useEffect(() => {
        if (!roomCode) return;
        const unsub = onValue(
            dbRef(db, `rooms/${roomCode}/players/${opponentRole}`),
            (snap) => {
                const data = snap.val();
                if (data) {
                    setOpponentAvatar(data.avatar ?? "❓");
                    setOpponentName(data.name ?? "Opponent");
                    setOpponentOnline(!!data.online);
                }
            },
            () => setRtdbWriteError(true)
        );
        return () => unsub();
    }, [roomCode, opponentRole]);

    // ── 3. Sync MY code → RTDB ───────────────────────────────────────────────
    const handleCodeChange = useCallback(
        (value: string | undefined) => {
            if (value === undefined || !roomCode) return;
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
            debounceTimer.current = setTimeout(() => {
                set(dbRef(db, `rooms/${roomCode}/code/${myRole}`), value)
                    .catch(() => setRtdbWriteError(true));
            }, 250);
        },
        [roomCode, myRole]
    );

    // ── 4. Subscribe to opponent's code ──────────────────────────────────────
    useEffect(() => {
        if (!roomCode || !opponentMounted) return;
        const unsub = onValue(
            dbRef(db, `rooms/${roomCode}/code/${opponentRole}`),
            (snap) => {
                const val: string | null = snap.val();
                if (val !== null && opponentEditorRef.current) {
                    const current = opponentEditorRef.current.getValue();
                    if (current !== val) opponentEditorRef.current.setValue(val);
                }
            },
            () => setRtdbWriteError(true)
        );
        return () => unsub();
    }, [roomCode, opponentRole, opponentMounted]);

    // ── 5. Anti-cheat ────────────────────────────────────────────────────────
    const flashAntiCheat = useCallback(() => {
        setAntiCheatVisible(true);
        setTimeout(() => setAntiCheatVisible(false), 2500);
    }, []);

    const handleMyEditorMount = useCallback(
        (editor: any) => {
            myEditorRef.current = editor;
            if (onMountEditor) onMountEditor(editor);

            // 1. Block DOM-level clipboard events (catches right-click paste, etc.)
            const dom = editor.getDomNode();
            if (dom) {
                const block = (e: Event) => { e.preventDefault(); flashAntiCheat(); };
                dom.addEventListener("copy", block);
                dom.addEventListener("paste", block);
                dom.addEventListener("cut", block);
            }

            // 2. Override Monaco's built-in editor actions (Ctrl+C, Ctrl+V, Ctrl+X)
            const noop = () => { flashAntiCheat(); };
            try {
                // editor.clipboard.copy
                editor.addAction({
                    id: "block-copy",
                    label: "Block Copy",
                    keybindings: [
                        // Monaco KeyMod.CtrlCmd | Monaco KeyCode.KeyC
                        2048 | 33, // CtrlCmd + C
                    ],
                    run: noop,
                });
                editor.addAction({
                    id: "block-paste",
                    label: "Block Paste",
                    keybindings: [
                        2048 | 52, // CtrlCmd + V
                    ],
                    run: noop,
                });
                editor.addAction({
                    id: "block-cut",
                    label: "Block Cut",
                    keybindings: [
                        2048 | 54, // CtrlCmd + X
                    ],
                    run: noop,
                });
            } catch {
                // Fallback: some Monaco versions use different keybinding APIs
            }

            // 3. Disable Monaco context menu (prevents paste from right-click menu)
            editor.updateOptions({ contextmenu: false });
        },
        [onMountEditor, flashAntiCheat]
    );

    const handleOpponentEditorMount = useCallback((editor: any) => {
        opponentEditorRef.current = editor;
        setOpponentMounted(true);
    }, []);

    // Monaco editor options
    const editorOptions = {
        minimap: { enabled: false },
        fontSize: 15,
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        fontLigatures: true,
        wordWrap: "on" as const,
        padding: { top: 12, bottom: 12 },
        scrollBeyondLastLine: false,
        lineNumbers: "on" as const,
        smoothScrolling: true,
        renderLineHighlight: "all" as const,
        cursorBlinking: "smooth" as const,
        cursorSmoothCaretAnimation: "on" as const,
    };

    // ── 12-hour timestamp helper ─────────────────────────────────────────────
    const now12h = (): string => {
        const d = new Date();
        let h = d.getHours();
        const m = d.getMinutes().toString().padStart(2, "0");
        const ampm = h >= 12 ? "PM" : "AM";
        h = h % 12 || 12;
        return `${h.toString().padStart(2, "0")}:${m} ${ampm}`;
    };

    // ── Run code via Piston ──────────────────────────────────────────────────
    const handleRunCode = useCallback(async () => {
        if (!myEditorRef.current || isRunning) return;
        const code: string = myEditorRef.current.getValue();
        if (!code.trim()) {
            setTerminalLogs((prev) => [...prev, { time: now12h(), text: "No code to execute.", type: "system" }]);
            return;
        }

        setIsRunning(true);
        setTerminalLogs((prev) => [...prev, { time: now12h(), text: "Executing…", type: "system" }]);

        try {
            const result = await submitPythonCode(code);
            const ts = now12h();
            if (result.stdout) {
                setTerminalLogs((prev) => [...prev, { time: ts, text: result.stdout, type: "stdout" }]);
            }
            if (result.stderr) {
                setTerminalLogs((prev) => [...prev, { time: ts, text: result.stderr, type: "stderr" }]);
            }
            if (!result.stdout && !result.stderr) {
                setTerminalLogs((prev) => [...prev, { time: ts, text: "Program finished with no output.", type: "system" }]);
            }
        } catch (err: any) {
            setTerminalLogs((prev) => [...prev, { time: now12h(), text: err.message ?? "Execution failed.", type: "stderr" }]);
        } finally {
            setIsRunning(false);
        }
    }, [isRunning]);

    // ────────────────────────────────────────────────────────────────────────
    return (
        <div className="flex w-full h-full gap-2 relative">

            {/* RTDB error banner */}
            {rtdbWriteError && (
                <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 bg-red-950/90 backdrop-blur-sm border border-red-500/30 text-red-300 px-4 py-2 rounded-xl text-xs font-semibold shadow-2xl max-w-sm">
                    <AlertTriangle size={14} className="flex-shrink-0 text-red-400" />
                    <span>DB not reachable — sync paused</span>
                </div>
            )}

            {/* Anti-cheat toast */}
            {antiCheatVisible && (
                <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[200] pointer-events-none">
                    <div className="bg-red-600/90 backdrop-blur-md text-white text-sm font-bold px-4 py-2 rounded-xl shadow-2xl border border-red-400/40 flex items-center gap-2 animate-bounce">
                        🚫 Copy / Paste / Cut disabled
                    </div>
                </div>
            )}

            {/* ── MY EDITOR ─────────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col rounded-xl overflow-hidden border border-sky-500/20 bg-[#0d1117] shadow-[0_0_20px_rgba(56,189,248,0.05)]">
                {/* Panel header */}
                <div className="flex items-center justify-between px-3 py-2 bg-[#0d1117] border-b border-sky-500/15 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="text-xl leading-none select-none">{avatar}</span>
                        <div>
                            <div className="text-xs font-bold text-sky-400 uppercase tracking-widest leading-tight">
                                {isHost ? "Host" : "Guest"} · You
                            </div>
                            <div className="text-xs text-slate-600 truncate max-w-[120px]">
                                {user?.displayName || "Anonymous"}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-sky-400 shadow-[0_0_4px_rgba(56,189,248,0.8)] animate-pulse" />
                            <span className="text-[10px] text-sky-500/70 font-mono uppercase">Live</span>
                        </div>
                        <div className="h-4 w-px bg-white/10" />
                        <button
                            onClick={handleRunCode}
                            disabled={isRunning}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all border ${
                                isRunning
                                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400/60 cursor-wait"
                                    : "bg-emerald-500/15 border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/25 hover:shadow-[0_0_12px_rgba(52,211,153,0.15)]"
                            }`}
                        >
                            {isRunning ? (
                                <Loader2 size={12} className="animate-spin" />
                            ) : (
                                <Play size={12} className="fill-current" />
                            )}
                            {isRunning ? "Running…" : "Run"}
                        </button>
                    </div>
                </div>

                <div className="flex-1 min-h-0">
                    <Editor
                        height="100%"
                        defaultLanguage="python"
                        theme="vs-dark"
                        onMount={handleMyEditorMount}
                        onChange={handleCodeChange}
                        defaultValue={"# Write your solution here...\n"}
                        options={editorOptions}
                    />
                </div>

                {/* ── Live Python Terminal ──────────────────────────────── */}
                <TerminalOutput logs={terminalLogs} />
            </div>

            {/* ── OPPONENT EDITOR ──────────────────────────────────────── */}
            <div className="flex-1 flex flex-col rounded-xl overflow-hidden border border-fuchsia-500/20 bg-[#0d1117] shadow-[0_0_20px_rgba(192,38,211,0.04)] opacity-90 hover:opacity-100 transition-opacity duration-300">
                <div className="flex items-center justify-between px-3 py-2 bg-[#0d1117] border-b border-fuchsia-500/15 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="text-xl leading-none select-none">{opponentAvatar}</span>
                        <div>
                            <div className="text-xs font-bold text-fuchsia-400 uppercase tracking-widest leading-tight">
                                {isHost ? "Guest" : "Host"} · Opponent
                            </div>
                            <div className="text-xs text-slate-600 truncate max-w-[120px]">
                                {opponentName}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        {opponentOnline ? (
                            <>
                                <div className="w-2 h-2 rounded-full bg-fuchsia-400 shadow-[0_0_4px_rgba(192,38,211,0.8)] animate-pulse" />
                                <span className="text-[10px] text-fuchsia-500/70 font-mono uppercase">Live</span>
                            </>
                        ) : (
                            <span className="text-[10px] text-slate-600 font-mono uppercase">Offline</span>
                        )}
                    </div>
                </div>

                <div className="flex-1 min-h-0">
                    <Editor
                        height="100%"
                        defaultLanguage="python"
                        theme="vs-dark"
                        onMount={handleOpponentEditorMount}
                        defaultValue={"# Opponent's code will appear here...\n"}
                        options={{
                            ...editorOptions,
                            readOnly: true,
                            domReadOnly: true,
                            renderLineHighlight: "none",
                            cursorStyle: "line",
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
