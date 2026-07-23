"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/components/AuthProvider";
import { LogIn, Code2, Swords, Mic } from "lucide-react";

export default function Home() {
  const { user, loading, signInWithGoogle } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push("/lobby");
    }
  }, [user, loading, router]);

  const handleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error("Login failed", err);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { clientX, clientY, currentTarget } = e;
    const { width, height, left, top } = currentTarget.getBoundingClientRect();
    const x = (clientX - left - width / 2) / 25;
    const y = (clientY - top - height / 2) / 25;
    
    currentTarget.style.transform = `perspective(1000px) rotateY(${x}deg) rotateX(${-y}deg) scale3d(1.02, 1.02, 1.02)`;
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = `perspective(1000px) rotateY(0deg) rotateX(0deg) scale3d(1, 1, 1)`;
  };

  if (loading) return null;

  return (
    <div className="flex items-center justify-center h-full w-full relative perspective-[1000px]">

      {/* Ambient glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-fuchsia-500/8 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />

      <motion.div
        initial={{ opacity: 0, scale: 0.88, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{
          opacity: { duration: 0.7 },
          scale: { type: "spring", stiffness: 300, damping: 25 },
          y: { type: "spring", stiffness: 300, damping: 25 }
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ transition: "transform 0.1s ease-out" }}
        className="glass-panel p-12 md:p-16 max-w-lg w-full flex flex-col items-center text-center mx-4 relative overflow-hidden group hover:border-indigo-500/30 transition-colors duration-500"
      >
        {/* Internal glow */}
        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/[0.08] via-transparent to-fuchsia-500/[0.08] rounded-3xl pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="absolute top-0 left-[15%] right-[15%] h-[2px] bg-gradient-to-r from-transparent via-indigo-400/40 to-transparent" />

        {/* Logo mark */}
        <motion.div
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 400, damping: 15 }}
          className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-fuchsia-500/20 border border-white/10 flex items-center justify-center mb-8 relative z-10 shadow-[0_0_40px_rgba(99,102,241,0.25)] group-hover:shadow-[0_0_60px_rgba(99,102,241,0.4)] transition-shadow duration-500"
        >
          <Code2 size={36} className="text-indigo-400 group-hover:scale-110 transition-transform duration-300" />
        </motion.div>

        <h1 className="text-5xl md:text-6xl font-extrabold mb-3 tracking-tight relative z-10">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400 drop-shadow-sm">
            Codemates
          </span>
        </h1>
        <p className="text-slate-300 mb-6 text-base md:text-lg font-medium tracking-wide relative z-10">
          Real-time multiplayer coding arena
        </p>

        {/* Feature pills */}
        <div className="flex gap-3 mb-10 relative z-10">
          {[
            { icon: Swords, label: "1v1 Battles" },
            { icon: Code2, label: "Live Sync" },
            { icon: Mic, label: "Voice Chat" },
          ].map((f) => (
            <div
              key={f.label}
              className="flex items-center gap-2 text-xs md:text-sm text-slate-400 font-medium bg-white/[0.04] border border-white/[0.08] px-3.5 py-1.5 rounded-full hover:bg-white/[0.08] hover:text-white transition-all cursor-default"
            >
              <f.icon size={14} className="text-slate-400" />
              {f.label}
            </div>
          ))}
        </div>

        <motion.button
          whileHover={{ scale: 1.03, boxShadow: "0px 0px 30px rgba(99,102,241,0.6)" }}
          whileTap={{ scale: 0.95 }}
          className="btn-primary w-full flex items-center justify-center gap-3 py-4 relative z-10 text-base md:text-lg"
          onClick={handleLogin}
        >
          <LogIn size={20} className="opacity-90" />
          <span className="font-semibold tracking-wide">Sign in with Google</span>
        </motion.button>

        <p className="text-xs md:text-sm text-slate-500 mt-5 relative z-10">
          Authenticate to enter the lobby
        </p>
      </motion.div>
    </div>
  );
}
