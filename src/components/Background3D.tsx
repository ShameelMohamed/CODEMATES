"use client";

import { motion } from "framer-motion";

export default function Background3D() {
    return (
        <div className="fixed inset-0 -z-50 bg-[#0B0F19] overflow-hidden">
            <motion.div
                className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/20 rounded-full blur-[120px]"
                animate={{ x: [0, 50, 0], y: [0, 30, 0] }}
                transition={{ repeat: Infinity, duration: 15, ease: "easeInOut" }}
            />
            <motion.div
                className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#5865F2]/20 rounded-full blur-[150px]"
                animate={{ x: [0, -40, 0], y: [0, -50, 0] }}
                transition={{ repeat: Infinity, duration: 20, ease: "easeInOut" }}
            />
            <motion.div
                className="absolute top-[20%] right-[20%] w-[30%] h-[30%] bg-fuchsia-500/10 rounded-full blur-[100px]"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 10, ease: "easeInOut" }}
            />
        </div>
    );
}
