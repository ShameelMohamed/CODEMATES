/**
 * Python code execution client.
 *
 * Sends code to our own Next.js API route (/api/execute) which runs
 * Python locally via child_process — no external APIs, no keys, no rate limits.
 */

export interface ExecutionResult {
    stdout: string;
    stderr: string;
}

/**
 * Submit Python code for local execution.
 * Returns parsed stdout and stderr strings.
 */
export async function submitPythonCode(code: string): Promise<ExecutionResult> {
    const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
    });

    const data = await res.json();

    if (!res.ok && !data.stderr) {
        throw new Error(`Execution failed (${res.status})`);
    }

    return {
        stdout: data.stdout ?? "",
        stderr: data.stderr ?? "",
    };
}
