"use client";

import { motion } from "framer-motion";

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98, filter: "blur(8px)" }}
      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      transition={{ 
        duration: 0.6, 
        ease: [0.22, 1, 0.36, 1], // easeOutQuint
      }}
      className="h-full w-full"
    >
      {children}
    </motion.div>
  );
}
