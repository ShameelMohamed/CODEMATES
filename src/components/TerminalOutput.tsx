"use client";

/**
 * TerminalOutput — a sleek, VS-Code-style terminal panel.
 *
 * Renders an array of log entries with 12-hour timestamps,
 * color-coded by type (stdout / stderr / system).
 */

import { useRef, useEffect } from "react";

export interface TerminalLog {
    time: string;           // pre-formatted 12-hour string e.g. "02:15 PM"
    text: string;
    type: "stdout" | "stderr" | "system";
}

interface Props {
    logs: TerminalLog[];
}

const TYPE_STYLES: Record<TerminalLog["type"], string> = {
    stdout: "text-slate-300",          // dimmed white/grey
    stderr: "text-red-400",            // distinct red
    system: "text-cyan-400",           // blue/cyan
};

const TYPE_PREFIX: Record<TerminalLog["type"], string> = {
    stdout: "",
    stderr: "stderr: ",
    system: "system: ",
};

export default function TerminalOutput({ logs }: Props) {
    const bottomRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to latest entry
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs.length]);

    return (
        <div className="h-64 overflow-auto bg-[#0A0A0A] border-t border-[#222] font-mono text-[13px] leading-relaxed select-text">
            {/* Terminal chrome header */}
            <div className="sticky top-0 z-10 flex items-center gap-2 px-4 py-1.5 bg-[#0A0A0A]/95 backdrop-blur-sm border-b border-[#1a1a1a]">
                <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
                </div>
                <span className="text-[11px] text-slate-600 font-semibold tracking-wider uppercase ml-1">
                    Terminal
                </span>
            </div>

            {/* Log entries */}
            <div className="px-4 py-2 space-y-0.5">
                {logs.length === 0 && (
                    <div className="text-slate-700 italic text-xs py-4">
                        Run your code to see output here…
                    </div>
                )}
                {logs.map((log, i) => (
                    <div key={i} className={`flex gap-2 ${TYPE_STYLES[log.type]}`}>
                        <span className="text-slate-600 flex-shrink-0 select-none">
                            [{log.time}]
                        </span>
                        <pre className="whitespace-pre-wrap break-all flex-1">
                            {TYPE_PREFIX[log.type]}{log.text}
                        </pre>
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>
        </div>
    );
}
