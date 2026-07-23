"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/components/AuthProvider";
import { formatTime12Hour } from "@/lib/formatTime";
import { LogOut, Copy, Check, Play, ArrowRight, Sparkles } from "lucide-react";

const AVATARS = ["👽", "👾", "🤖", "👻", "⚡", "🔥", "🔮", "🌌"];

function generateRoomCode(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const arr = new Uint8Array(6);
    crypto.getRandomValues(arr);
    return Array.from(arr, (b) => chars[b % chars.length]).join("");
}

const ROOM_CODE_PATTERN = /^[A-Z0-9]{6}$/;

export default function LobbyPage() {
    const { user, loading, logout } = useAuth();
    const router = useRouter();

    const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
    const [roomCode, setRoomCode] = useState("");
    const [joinCode, setJoinCode] = useState("");
    const [joinError, setJoinError] = useState("");
    const [currentTime, setCurrentTime] = useState("");
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!loading && !user) router.push("/");
    }, [user, loading, router]);

    useEffect(() => {
        setRoomCode(generateRoomCode());
        setCurrentTime(formatTime12Hour(new Date()));
        const interval = setInterval(() => {
            setCurrentTime(formatTime12Hour(new Date()));
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const handleCopyCode = useCallback(() => {
        navigator.clipboard.writeText(roomCode).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }, [roomCode]);

    const handleCreateRoom = useCallback(() => {
        const secret = generateRoomCode();
        const avatarParam = encodeURIComponent(selectedAvatar);
        router.push(`/arena?room=${roomCode}&secret=${secret}&avatar=${avatarParam}`);
    }, [router, roomCode, selectedAvatar]);

    const handleJoinRoom = useCallback(
        (e: React.FormEvent) => {
            e.preventDefault();
            const code = joinCode.toUpperCase().trim();
            if (!ROOM_CODE_PATTERN.test(code)) {
                setJoinError("Room code must be 6 characters (A-Z, 0-9).");
                return;
            }
            setJoinError("");
            const avatarParam = encodeURIComponent(selectedAvatar);
            router.push(`/arena?room=${code}&avatar=${avatarParam}`);
        },
        [joinCode, selectedAvatar, router]
    );

    const handleJoinCodeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
        setJoinCode(val);
        if (joinError) setJoinError("");
    }, [joinError]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const { clientX, clientY, currentTarget } = e;
        const { width, height, left, top } = currentTarget.getBoundingClientRect();
        const x = (clientX - left - width / 2) / 35;
        const y = (clientY - top - height / 2) / 35;
        currentTarget.style.transform = `perspective(1200px) rotateY(${x}deg) rotateX(${-y}deg)`;
    };

    const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
        e.currentTarget.style.transform = `perspective(1200px) rotateY(0deg) rotateX(0deg)`;
    };

    if (loading || !user) return null;

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 relative perspective-[1200px]">

            {/* Ambient glow */}
            <div className="absolute top-1/3 left-1/3 w-[500px] h-[500px] bg-indigo-500/6 rounded-full blur-[140px] pointer-events-none mix-blend-screen" />
            <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-fuchsia-500/5 rounded-full blur-[140px] pointer-events-none mix-blend-screen" />

            {/* Top bar */}
            <motion.div
                className="absolute top-6 right-6 flex items-center gap-3 z-20"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
            >
                <span className="font-mono text-sm text-indigo-400 font-semibold bg-indigo-500/8 border border-indigo-500/15 px-3 py-1.5 rounded-lg shadow-[0_0_15px_rgba(99,102,241,0.1)]">
                    {currentTime}
                </span>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-2 text-sm text-slate-400 hover:text-red-400 font-medium transition-colors bg-white/[0.04] px-4 py-1.5 rounded-lg border border-white/[0.06] hover:border-red-500/25 shadow-sm"
                    onClick={logout}
                >
                    <LogOut size={16} /> Logout
                </motion.button>
            </motion.div>

            {/* Main card */}
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                style={{ transition: "transform 0.15s ease-out" }}
                className="glass-panel p-8 md:p-12 w-full max-w-[900px] flex flex-col md:flex-row gap-8 md:gap-12 relative overflow-hidden z-10 group"
            >
                {/* Internal glows */}
                <div className="absolute -top-24 -left-24 w-72 h-72 bg-indigo-500/8 rounded-full blur-[80px] pointer-events-none group-hover:bg-indigo-500/12 transition-colors duration-700" />
                <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-fuchsia-500/6 rounded-full blur-[80px] pointer-events-none group-hover:bg-fuchsia-500/10 transition-colors duration-700" />

                {/* ── LEFT: Profile ─────────────────────────────────────── */}
                <div className="flex-1 flex flex-col items-center md:border-r border-white/[0.06] md:pr-10 relative z-10">
                    {/* Avatar display */}
                    <motion.div
                        whileHover={{ scale: 1.08, rotate: 5 }}
                        transition={{ type: "spring", stiffness: 400, damping: 20 }}
                        className="text-7xl mb-5 p-6 rounded-[2rem] bg-gradient-to-tr from-indigo-500/15 to-fuchsia-500/15 border border-white/10 shadow-2xl backdrop-blur-xl select-none cursor-default"
                    >
                        {selectedAvatar}
                    </motion.div>

                    <h2 className="text-xl font-bold mb-1 text-white">
                        {user.displayName || "Anonymous Engineer"}
                    </h2>
                    <p className="text-sm text-slate-400 mb-8">{user.email}</p>

                    {/* Avatar picker */}
                    <div className="w-full">
                        <p className="text-xs font-bold mb-3 text-slate-500 tracking-widest uppercase text-center flex items-center justify-center gap-2">
                            <Sparkles size={14} className="text-slate-500" />
                            Choose Avatar
                        </p>
                        <div className="flex flex-wrap gap-2.5 justify-center">
                            {AVATARS.map((a) => (
                                <motion.button
                                    key={a}
                                    whileHover={{ scale: 1.15, y: -3 }}
                                    whileTap={{ scale: 0.9 }}
                                    transition={{ type: "spring", stiffness: 500, damping: 18 }}
                                    onClick={() => setSelectedAvatar(a)}
                                    className={`text-2xl p-2.5 rounded-2xl transition-all duration-200 border select-none ${
                                        selectedAvatar === a
                                            ? "bg-indigo-500/30 border-indigo-400/60 shadow-[0_0_20px_rgba(99,102,241,0.4)] scale-110"
                                            : "bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.1] opacity-60 hover:opacity-100 saturate-50 hover:saturate-100"
                                    }`}
                                >
                                    {a}
                                </motion.button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── RIGHT: Matchmaking ─────────────────────────────────── */}
                <div className="flex-1 flex flex-col justify-center gap-6 relative z-10">

                    {/* Host a Match */}
                    <div className="p-6 bg-slate-900/50 rounded-3xl border border-white/[0.06] relative overflow-hidden group/host hover:border-indigo-500/30 transition-all duration-300 hover:shadow-[0_0_40px_rgba(99,102,241,0.12)]">
                        <div className="absolute -top-16 -right-16 w-48 h-48 bg-indigo-500/10 rounded-full blur-[60px] group-hover/host:bg-indigo-500/20 transition-colors duration-500 pointer-events-none" />

                        <h3 className="text-lg font-bold mb-1.5 text-white relative z-10">Host a Match</h3>
                        <p className="text-xs md:text-sm text-slate-400 mb-5 relative z-10">
                            Share this code with your opponent.
                        </p>

                        {/* Room code + copy */}
                        <div className="flex items-center gap-3 mb-5 relative z-10">
                            <div className="flex-1 bg-black/40 border border-white/[0.08] rounded-2xl py-4 text-center text-3xl font-mono font-black tracking-[0.25em] text-white select-all shadow-inner">
                                {roomCode}
                            </div>
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.92 }}
                                onClick={handleCopyCode}
                                title="Copy room code"
                                className={`p-4 rounded-2xl border transition-all duration-200 ${
                                    copied
                                        ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                                        : "bg-white/[0.05] border-white/[0.1] text-slate-400 hover:text-white hover:bg-white/[0.1]"
                                }`}
                            >
                                <AnimatePresence mode="wait">
                                    {copied ? (
                                        <motion.div key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                                            <Check size={20} />
                                        </motion.div>
                                    ) : (
                                        <motion.div key="copy" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                                            <Copy size={20} />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.button>
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.03, boxShadow: "0px 0px 25px rgba(99,102,241,0.5)" }}
                            whileTap={{ scale: 0.96 }}
                            onClick={handleCreateRoom}
                            className="w-full btn-primary flex justify-center items-center gap-2.5 text-sm md:text-base py-3.5 relative z-10"
                        >
                            <Play size={16} fill="currentColor" />
                            Enter Arena
                        </motion.button>
                    </div>

                    {/* Join a Match */}
                    <div className="p-6 bg-slate-900/50 rounded-3xl border border-white/[0.06] relative overflow-hidden group/join hover:border-fuchsia-500/30 transition-all duration-300 hover:shadow-[0_0_40px_rgba(236,72,153,0.12)]">
                        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-fuchsia-500/10 rounded-full blur-[60px] group-hover/join:bg-fuchsia-500/20 transition-colors duration-500 pointer-events-none" />

                        <h3 className="text-lg font-bold mb-4 text-white relative z-10">Join a Match</h3>

                        <form onSubmit={handleJoinRoom} className="flex gap-3 relative z-10">
                            <input
                                type="text"
                                placeholder="ENTER CODE"
                                maxLength={6}
                                value={joinCode}
                                onChange={handleJoinCodeChange}
                                className="flex-1 bg-black/40 border border-white/[0.08] rounded-2xl px-5 py-3 font-mono font-bold text-center uppercase focus:outline-none focus:border-fuchsia-500/50 focus:ring-2 focus:ring-fuchsia-500/20 transition-all text-xl tracking-[0.2em] shadow-inner placeholder:text-slate-600 placeholder:text-base placeholder:font-normal placeholder:tracking-normal"
                            />
                            <motion.button
                                whileHover={{ scale: 1.03, boxShadow: "0px 0px 20px rgba(217,70,239,0.4)" }}
                                whileTap={{ scale: 0.96 }}
                                type="submit"
                                className="bg-gradient-to-r from-fuchsia-600 to-pink-500 text-white px-6 rounded-2xl font-bold text-sm md:text-base flex items-center gap-2 shadow-lg shadow-fuchsia-500/20 border border-fuchsia-500/30 transition-all"
                            >
                                Join <ArrowRight size={16} />
                            </motion.button>
                        </form>

                        <AnimatePresence>
                            {joinError && (
                                <motion.p
                                    initial={{ opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    className="text-xs text-red-400 mt-3 relative z-10"
                                >
                                    {joinError}
                                </motion.p>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
