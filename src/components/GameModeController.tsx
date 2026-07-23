"use client";

/**
 * GameModeController — manages game mode selection, question sync, and code evaluation.
 *
 * UI Architecture:
 *  - <GameModeControls />  → renders in the header bar (mode buttons + submit)
 *  - <QuestionStrip />     → renders between header and editors (inline, not floating)
 *  - <ToastStack />        → fixed top-center toast notifications
 *
 * All three read from the same shared context so there's no prop drilling.
 */

import { useState, useCallback, useEffect, useRef, createContext, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Bug, Hash, CheckCircle2, XCircle, Info, X, Send } from "lucide-react";
import { questionBank, Question } from "@/lib/questionBank";
import { ref as dbRef, onValue, set } from "firebase/database";
import { db } from "@/lib/firebase";

type GameMode = "IDLE" | "BUG_HUNT" | "CODE_GOLF" | "SYNTAX_SPRINT";

interface Toast {
    message: string;
    type: "success" | "error" | "info";
    id: number;
}

// ── Mode metadata ────────────────────────────────────────────────────────────
const MODE_META = {
    BUG_HUNT: {
        label: "Bug Hunt",
        icon: Bug,
        color: "red",
        activeBg: "bg-red-500/20",
        activeBorder: "border-red-500/40",
        activeText: "text-red-300",
        gradient: "from-red-600 to-rose-500",
        glow: "shadow-red-500/20",
        accent: "#f87171",
    },
    CODE_GOLF: {
        label: "Code Golf",
        icon: Hash,
        color: "violet",
        activeBg: "bg-violet-500/20",
        activeBorder: "border-violet-500/40",
        activeText: "text-violet-300",
        gradient: "from-violet-600 to-purple-500",
        glow: "shadow-violet-500/20",
        accent: "#a78bfa",
    },
    SYNTAX_SPRINT: {
        label: "Sprint",
        icon: Zap,
        color: "emerald",
        activeBg: "bg-emerald-500/20",
        activeBorder: "border-emerald-500/40",
        activeText: "text-emerald-300",
        gradient: "from-emerald-600 to-green-500",
        glow: "shadow-emerald-500/20",
        accent: "#34d399",
    },
} as const;

// ── Shared context ───────────────────────────────────────────────────────────
interface GameCtx {
    currentMode: GameMode;
    currentQuestion: Question | null;
    charCount: number;
    isSubmitting: boolean;
    toasts: Toast[];
    isHost: boolean;
    voteCount: number;
    handleModeChange: (mode: GameMode) => void;
    handleSubmit: () => void;
    dismissToast: (id: number) => void;
}

const GameContext = createContext<GameCtx | null>(null);
const useGame = () => useContext(GameContext)!;

// ── Provider ─────────────────────────────────────────────────────────────────
interface Props {
    editorRef: React.MutableRefObject<any>;
    roomCode: string;
    isHost: boolean;
    children: React.ReactNode;
}

export function GameModeProvider({ editorRef, roomCode, isHost, children }: Props) {
    const [currentMode, setCurrentMode] = useState<GameMode>("IDLE");
    const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
    const [charCount, setCharCount] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [voteCount, setVoteCount] = useState(0);
    const [toasts, setToasts] = useState<Toast[]>([]);
    const toastIdRef = useRef(0);

    // ── Toast helpers ────────────────────────────────────────────────────────
    const addToast = useCallback((message: string, type: Toast["type"]) => {
        const id = ++toastIdRef.current;
        setToasts((prev) => [...prev, { message, type, id }]);
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
    }, []);

    const dismissToast = useCallback((id: number) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    // ── Subscribe to game state from RTDB ────────────────────────────────────
    useEffect(() => {
        if (!roomCode) return;
        const unsub = onValue(
            dbRef(db, `rooms/${roomCode}/gameState`),
            (snap) => {
                const state = snap.val();
                if (!state) return;
                const newMode: GameMode = state.mode;
                const q = questionBank.find((q) => q.id === state.questionId) ?? null;
                const vCount = state.votes ? Object.keys(state.votes).length : 0;
                
                // Show game over toast if both voted and mode was not idle
                if (vCount >= 2 && newMode !== "IDLE") {
                    addToast("🤝 Both players voted! Game ended.", "success");
                    if (isHost) {
                        setTimeout(() => {
                            set(dbRef(db, `rooms/${roomCode}/gameState`), {
                                mode: "IDLE",
                                questionId: null
                            });
                        }, 2000);
                    }
                }

                setCurrentMode(newMode);
                setCurrentQuestion(q);
                setVoteCount(vCount);
                setCharCount(0);
                if (q && editorRef.current) {
                    const code = q.starterCode ?? q.targetCode ?? `# ${q.title}\n`;
                    editorRef.current.setValue(code);
                }
            }
        );
        return () => unsub();
    }, [roomCode, editorRef, isHost, addToast]);

    // ── Host: select a mode and write to RTDB ───────────────────────────────
    const handleModeChange = useCallback(
        async (mode: GameMode) => {
            if (!isHost) return;
            const pool = questionBank.filter((q) => q.mode === mode);
            if (!pool.length) return;
            const randomQ = pool[Math.floor(Math.random() * pool.length)];
            await set(dbRef(db, `rooms/${roomCode}/gameState`), {
                mode,
                questionId: randomQ.id,
                votes: null
            });
        },
        [isHost, roomCode]
    );

    // ── Submit / Evaluate code ───────────────────────────────────────────────
    const handleSubmit = useCallback(async () => {
        if (!editorRef.current || !currentQuestion) return;
        const code: string = editorRef.current.getValue();

        // Register Vote
        const myRole = isHost ? "host" : "guest";
        await set(dbRef(db, `rooms/${roomCode}/gameState/votes/${myRole}`), true);

        if (currentMode === "SYNTAX_SPRINT") {
            if (code.trim() === (currentQuestion.targetCode ?? "").trim()) {
                addToast("🏆 Perfect match! Syntax Sprint complete! Waiting for opponent to vote.", "success");
            } else {
                addToast("❌ Not quite right — keep typing!", "error");
            }
            return;
        }

        setIsSubmitting(true);
        try {
            if (currentMode === "BUG_HUNT") {
                addToast("🐛 Code submitted! Check with opponent. Waiting for their vote...", "info");
            } else if (currentMode === "CODE_GOLF") {
                const count = code.replace(/\s+/g, "").length;
                setCharCount(count);
                addToast(`⛳ Score: ${count} chars. Waiting for opponent to vote...`, "info");
            }
        } catch {
            addToast("⚠️ Submission error.", "error");
        } finally {
            setIsSubmitting(false);
        }
    }, [editorRef, currentQuestion, currentMode, addToast, isHost, roomCode]);

    const ctx: GameCtx = {
        currentMode, currentQuestion, charCount, isSubmitting,
        toasts, isHost, voteCount, handleModeChange, handleSubmit, dismissToast,
    };

    return <GameContext.Provider value={ctx}>{children}</GameContext.Provider>;
}

// ── Toast Stack (fixed position, top-center) ─────────────────────────────────
export function ToastStack() {
    const { toasts, dismissToast } = useGame();
    return (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-3 items-center pointer-events-none w-[min(92vw,500px)]">
            <AnimatePresence>
                {toasts.map((t) => (
                    <motion.div
                        key={t.id}
                        initial={{ opacity: 0, y: -14, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.96 }}
                        className={`pointer-events-auto flex items-start gap-4 w-full px-5 py-4 rounded-xl font-medium text-sm shadow-2xl border backdrop-blur-xl ${
                            t.type === "success"
                                ? "bg-emerald-950/85 border-emerald-500/30 text-emerald-200"
                                : t.type === "error"
                                ? "bg-red-950/85 border-red-500/30 text-red-200"
                                : "bg-indigo-950/85 border-indigo-500/30 text-indigo-200"
                        }`}
                    >
                        {t.type === "success" ? (
                            <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0 text-emerald-400" />
                        ) : t.type === "error" ? (
                            <XCircle size={18} className="mt-0.5 flex-shrink-0 text-red-400" />
                        ) : (
                            <Info size={18} className="mt-0.5 flex-shrink-0 text-indigo-400" />
                        )}
                        <span className="flex-1 leading-snug">{t.message}</span>
                        <button
                            onClick={() => dismissToast(t.id)}
                            className="opacity-40 hover:opacity-100 flex-shrink-0 mt-0.5 transition-opacity"
                        >
                            <X size={16} />
                        </button>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}

// ── Header Controls (mode buttons + submit) ──────────────────────────────────
export function GameModeControls() {
    const { currentMode, charCount, isSubmitting, isHost, voteCount, handleModeChange, handleSubmit } = useGame();
    const activeMeta = currentMode !== "IDLE" ? MODE_META[currentMode] : null;

    return (
        <div className="flex items-center gap-3">
            {/* Mode selector pills */}
            <div className="flex gap-1 bg-white/[0.03] p-1.5 rounded-xl border border-white/[0.06]">
                {isHost ? (
                    (Object.keys(MODE_META) as Array<keyof typeof MODE_META>).map((mode) => {
                        const meta = MODE_META[mode];
                        const Icon = meta.icon;
                        const isActive = currentMode === mode;
                        return (
                            <button
                                key={mode}
                                onClick={() => handleModeChange(mode)}
                                className={`px-3 py-2 rounded-lg text-xs flex items-center gap-2 transition-all font-semibold border ${
                                    isActive
                                        ? `${meta.activeBg} ${meta.activeBorder} ${meta.activeText}`
                                        : "border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/[0.06]"
                                }`}
                            >
                                <Icon size={14} />
                                {meta.label}
                            </button>
                        );
                    })
                ) : (
                    <div className="text-xs text-slate-600 font-semibold px-4 py-2 animate-pulse uppercase tracking-wider">
                        Waiting for Host…
                    </div>
                )}
            </div>

            {/* Voting status / Char count */}
            {currentMode !== "IDLE" && voteCount > 0 && (
                <div className="text-xs font-bold text-amber-400 px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    Votes: {voteCount}/2
                </div>
            )}
            {currentMode === "CODE_GOLF" && charCount > 0 && (
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="bg-violet-500/15 border border-violet-500/25 px-3 py-1.5 rounded-lg font-mono text-violet-300 font-bold text-xs"
                >
                    {charCount} chars
                </motion.div>
            )}

            {/* Submit button */}
            {currentMode !== "IDLE" && activeMeta && (
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className={`bg-gradient-to-r ${activeMeta.gradient} text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-lg ${activeMeta.glow} disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 border border-white/15`}
                >
                    {isSubmitting ? (
                        <>
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Running…
                        </>
                    ) : (
                        <>
                            <Send size={14} />
                            Submit & Vote
                        </>
                    )}
                </motion.button>
            )}
        </div>
    );
}

// ── Question Strip (inline between header and editors) ───────────────────────
export function QuestionStrip() {
    const { currentMode, currentQuestion } = useGame();
    const activeMeta = currentMode !== "IDLE" ? MODE_META[currentMode] : null;

    return (
        <AnimatePresence>
            {currentQuestion && activeMeta && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden flex-shrink-0"
                >
                    <div className={`rounded-2xl border ${activeMeta.activeBorder} bg-slate-900/50 backdrop-blur-md overflow-hidden`}>
                        {/* Strip header */}
                        <div className={`flex items-center gap-2 px-4 py-2 border-b border-white/[0.05] ${activeMeta.activeBg}`}>
                            <activeMeta.icon size={13} className={activeMeta.activeText} />
                            <span className={`text-[11px] font-bold uppercase tracking-widest ${activeMeta.activeText}`}>
                                {currentMode.replace("_", " ")}
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium">·</span>
                            <span className="text-[12px] text-white font-semibold truncate">
                                {currentQuestion.title}
                            </span>
                        </div>

                        {/* Strip body */}
                        <div className="px-4 py-2.5">
                            {/* Description */}
                            <p className="text-[12px] text-slate-300 leading-relaxed mb-2">
                                {currentQuestion.description}
                            </p>

                            {/* Target code preview (Syntax Sprint only) — full-width block below description */}
                            {currentMode === "SYNTAX_SPRINT" && currentQuestion.targetCode && (
                                <div className="rounded-xl bg-black/50 border border-emerald-500/15 p-3 font-mono text-[12px] text-emerald-300 whitespace-pre-wrap overflow-auto max-h-32 leading-relaxed select-none">
                                    {currentQuestion.targetCode}
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// ── Legacy default export for backward compatibility ─────────────────────────
// (Not used anymore — Arena uses GameModeProvider + separate components)
export default function GameModeController({ editorRef, roomCode, isHost }: { editorRef: React.MutableRefObject<any>; roomCode: string; isHost: boolean }) {
    return (
        <GameModeProvider editorRef={editorRef} roomCode={roomCode} isHost={isHost}>
            <GameModeControls />
            <ToastStack />
        </GameModeProvider>
    );
}
