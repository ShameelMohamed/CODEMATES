/**
 * /api/execute — Python code execution.
 *
 * Local dev: Spawns a Python 3 child process with a 10-second timeout.
 * Vercel:    Returns a helpful error (no Python runtime available in serverless).
 *
 * Security notes:
 *  - 10s hard timeout kills runaway/infinite loops
 *  - Temp file cleanup in finally block
 */

import { NextRequest, NextResponse } from "next/server";

const TIMEOUT_MS = 10_000; // 10 seconds

export async function POST(req: NextRequest) {
    // Detect Vercel serverless environment — no Python available
    if (process.env.VERCEL) {
        return NextResponse.json({
            stdout: "",
            stderr: "⚠️ Live code execution is only available in local development.\nVercel serverless functions do not include a Python runtime.\n\nTo run code, use the local dev server (npm run dev).",
        });
    }

    // Dynamic imports — these Node.js builtins are only available locally
    const { execFile } = await import("child_process");
    const { writeFile, unlink } = await import("fs/promises");
    const { join } = await import("path");
    const { tmpdir } = await import("os");
    const { randomUUID } = await import("crypto");

    let tmpPath = "";

    try {
        const body = await req.json();
        const code: string = body.code ?? "";

        if (!code.trim()) {
            return NextResponse.json({ stdout: "", stderr: "No code provided." });
        }

        // Write code to a temp file so we don't have to deal with shell escaping
        const filename = `codemates_${randomUUID().slice(0, 8)}.py`;
        tmpPath = join(tmpdir(), filename);
        await writeFile(tmpPath, code, "utf-8");

        // Determine Python binary name (Windows vs Unix)
        const pythonBin = process.platform === "win32" ? "python" : "python3";

        const { stdout, stderr } = await new Promise<{ stdout: string; stderr: string }>(
            (resolve, reject) => {
                execFile(
                    pythonBin,
                    [tmpPath],
                    {
                        timeout: TIMEOUT_MS,
                        maxBuffer: 1024 * 512, // 512 KB
                        env: { ...process.env, PYTHONIOENCODING: "utf-8" },
                    },
                    (error, stdout, stderr) => {
                        if (error && (error as any).killed) {
                            resolve({
                                stdout: stdout ?? "",
                                stderr: `Execution timed out after ${TIMEOUT_MS / 1000}s. Possible infinite loop?`,
                            });
                        } else if (error) {
                            resolve({
                                stdout: stdout ?? "",
                                stderr: stderr || error.message,
                            });
                        } else {
                            resolve({ stdout: stdout ?? "", stderr: stderr ?? "" });
                        }
                    }
                );
            }
        );

        return NextResponse.json({ stdout, stderr });
    } catch (err: any) {
        return NextResponse.json(
            { stdout: "", stderr: err.message ?? "Internal execution error." },
            { status: 500 }
        );
    } finally {
        if (tmpPath) {
            const { unlink } = await import("fs/promises");
            unlink(tmpPath).catch(() => {});
        }
    }
}
