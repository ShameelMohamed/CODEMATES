"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, ExternalLink, Copy, Check, AlertTriangle, Database, ShieldAlert } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import EditorClient from "@/components/EditorClient";
import { GameModeProvider, GameModeControls, QuestionStrip, ToastStack } from "@/components/GameModeController";
import VoiceChat from "@/components/VoiceChat";
import { checkRTDB, db, type RTDBStatus } from "@/lib/firebase";
import { ref as dbRef, remove, set } from "firebase/database";

// ── Setup Guide overlay ──────────────────────────────────────────────────────
function RTDBSetupGuide({ status }: { status: RTDBStatus }) {
    const [copiedRules, setCopiedRules] = useState(false);

    const rules = `{
  "rules": {
    "rooms": {
      "$roomCode": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    }
  }
}`;

    const copyRules = () => {
        navigator.clipboard.writeText(rules);
        setCopiedRules(true);
        setTimeout(() => setCopiedRules(false), 2500);
    };

    const isNoDB = status === "no-database";

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="glass-panel p-7 max-w-lg w-full border border-amber-500/30 shadow-[0_0_50px_rgba(245,158,11,0.12)]"
            >
                <div className="flex items-center gap-3 mb-5">
                    <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/25">
                        {isNoDB ? <Database size={20} className="text-amber-400" /> : <ShieldAlert size={20} className="text-amber-400" />}
                    </div>
                    <div>
                        <h2 className="text-base font-extrabold text-white">Firebase RTDB Setup Required</h2>
                        <p className="text-[11px] text-amber-400 font-mono mt-0.5">
                            {isNoDB ? "Database not found" : "Security rules blocking access"}
                        </p>
                    </div>
                </div>

                <div className="space-y-3">
                    {isNoDB && (
                        <div className="bg-slate-900/50 rounded-xl p-3.5 border border-white/[0.06]">
                            <p className="text-[13px] font-bold text-white mb-2">Step 1 — Create Database</p>
                            <ol className="text-[11px] text-slate-400 space-y-1 list-decimal list-inside leading-relaxed">
                                <li>Open <strong className="text-slate-200">Firebase Console</strong> → <strong className="text-indigo-400">codemates-8</strong></li>
                                <li><strong className="text-slate-200">Build</strong> → <strong className="text-slate-200">Realtime Database</strong> → <strong className="text-slate-200">Create Database</strong></li>
                                <li>Choose <strong className="text-slate-200">Start in test mode</strong></li>
                            </ol>
                            <a
                                href="https://console.firebase.google.com/project/codemates-8/database"
                                target="_blank"
                                rel="noreferrer"
                                className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold"
                            >
                                Open Console <ExternalLink size={10} />
                            </a>
                        </div>
                    )}

                    <div className="bg-slate-900/50 rounded-xl p-3.5 border border-white/[0.06]">
                        <p className="text-[13px] font-bold text-white mb-1">{isNoDB ? "Step 2 — " : ""}Set Security Rules</p>
                        <div className="relative mt-2">
                            <pre className="bg-black/50 rounded-lg p-2.5 text-[11px] text-emerald-300 font-mono overflow-auto border border-white/[0.06]">{rules}</pre>
                            <button
                                onClick={copyRules}
                                className={`absolute top-1.5 right-1.5 p-1 rounded-md transition-all border text-[10px] ${copiedRules ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400" : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"}`}
                            >
                                {copiedRules ? <Check size={10} /> : <Copy size={10} />}
                            </button>
                        </div>
                    </div>

                    <div className="bg-amber-500/[0.06] rounded-xl p-3 border border-amber-500/15 flex items-start gap-2">
                        <AlertTriangle size={12} className="text-amber-400 mt-0.5 flex-shrink-0" />
                        <p className="text-[11px] text-amber-300 leading-relaxed">
                            After setup, <strong>refresh this page</strong> — sync starts instantly.
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => window.location.reload()}
                    className="mt-5 w-full btn-primary flex items-center justify-center gap-2 py-2.5 text-[13px]"
                >
                    ↻ Retry Connection
                </button>
            </motion.div>
        </div>
    );
}

// ── Arena Content ────────────────────────────────────────────────────────────
function ArenaContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user, loading, logout } = useAuth();

    const roomCode = searchParams.get("room") ?? "DEFAULT";
    const secret   = searchParams.get("secret");
    const avatar   = decodeURIComponent(searchParams.get("avatar") ?? "👾");
    const isHost   = !!secret;

    const editorRef = useRef<any>(null);
    const [rtdbStatus, setRtdbStatus] = useState<RTDBStatus>("checking");

    useEffect(() => { if (!loading && !user) router.push("/"); }, [user, loading, router]);
    useEffect(() => { if (!user) return; checkRTDB().then(setRtdbStatus); }, [user]);

    if (loading || !user) return null;

    return (
        <GameModeProvider editorRef={editorRef} roomCode={roomCode} isHost={isHost}>

            {/* Toast stack — fixed overlay */}
            <ToastStack />

            {/* RTDB Setup Guide */}
            <AnimatePresence>
                {(rtdbStatus === "no-database" || rtdbStatus === "permission-denied") && (
                    <RTDBSetupGuide status={rtdbStatus} />
                )}
            </AnimatePresence>

            <div className="flex flex-col h-screen w-screen p-2.5 gap-2 bg-[#0B0F19]">

                {/* ── Header ────────────────────────────────────────────── */}
                <header className="flex-shrink-0 flex items-center justify-between px-4 py-2.5 rounded-xl relative overflow-hidden bg-slate-900/60 border border-white/[0.06] backdrop-blur-xl">
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/[0.04] via-transparent to-fuchsia-500/[0.04] pointer-events-none" />
                    <div className="absolute top-0 left-[20%] right-[20%] h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />

                    {/* Left: Brand + Room */}
                    <div className="flex items-center gap-3 relative z-10">
                        <h1 className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 to-fuchsia-400 bg-clip-text text-transparent select-none">
                            Codemates
                        </h1>
                        <div className="h-4 w-px bg-white/10" />
                        <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm bg-indigo-500/10 border border-indigo-500/15 px-3 py-1 rounded-md text-indigo-300 tracking-[0.12em] select-all">
                                {roomCode}
                            </span>
                            {isHost && (
                                <span className="text-xs bg-amber-500/12 border border-amber-500/20 text-amber-300 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
                                    Host
                                </span>
                            )}
                        </div>
                        <div className="h-4 w-px bg-white/10 hidden md:block" />
                        <div className="hidden md:flex items-center gap-2 bg-white/[0.04] border border-white/[0.06] px-3 py-1.5 rounded-lg">
                            <span className="text-lg leading-none">{avatar}</span>
                            <span className="text-xs text-slate-400 font-medium truncate max-w-[90px]">
                                {user.displayName?.split(" ")[0] ?? "You"}
                            </span>
                        </div>

                        {/* RTDB status */}
                        <div className="hidden md:flex items-center gap-1.5">
                            <div className={`w-2 h-2 rounded-full ${
                                rtdbStatus === "ok" ? "bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.7)]" :
                                rtdbStatus === "checking" ? "bg-amber-400 animate-pulse" :
                                "bg-red-400 shadow-[0_0_5px_rgba(239,68,68,0.7)]"
                            }`} />
                            <span className="text-xs text-slate-600 font-mono uppercase">
                                {rtdbStatus === "ok" ? "Synced" : rtdbStatus === "checking" ? "..." : "Error"}
                            </span>
                        </div>
                    </div>

                    {/* Right: Voice + Game controls + Leave */}
                    <div className="flex items-center gap-2 relative z-10">
                        <VoiceChat roomCode={roomCode} isHost={isHost} />
                        <div className="h-4 w-px bg-white/10" />
                        <GameModeControls />
                        <div className="h-4 w-px bg-white/10" />
                        <motion.button
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={async () => {
                                try {
                                    if (isHost) {
                                        await remove(dbRef(db, `rooms/${roomCode}`));
                                    } else {
                                        await set(dbRef(db, `rooms/${roomCode}/players/guest/online`), false);
                                    }
                                } catch { /* best-effort */ }
                                await logout();
                                router.push("/");
                            }}
                            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-400 transition-colors bg-white/[0.03] hover:bg-red-500/10 px-3 py-2 rounded-lg border border-white/[0.06] hover:border-red-500/20 font-semibold"
                        >
                            <LogOut size={14} />
                            Leave
                        </motion.button>
                    </div>
                </header>

                {/* ── Question Strip (inline, between header and editors) ── */}
                <QuestionStrip />

                {/* ── Split-screen Editors ──────────────────────────────── */}
                <main className="flex-1 min-h-0 overflow-hidden">
                    <EditorClient
                        roomCode={roomCode}
                        isHost={isHost}
                        avatar={avatar}
                        onMountEditor={(editor) => { editorRef.current = editor; }}
                    />
                </main>
            </div>
        </GameModeProvider>
    );
}

// ── Page wrapper ─────────────────────────────────────────────────────────────
export default function ArenaPage() {
    return (
        <Suspense
            fallback={
                <div className="h-screen w-screen flex items-center justify-center bg-[#0B0F19]">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-2 border-indigo-500/40 border-t-indigo-400 rounded-full animate-spin" />
                        <div className="text-indigo-400 font-mono text-sm tracking-widest animate-pulse">Loading Arena</div>
                    </div>
                </div>
            }
        >
            <ArenaContent />
        </Suspense>
    );
}
