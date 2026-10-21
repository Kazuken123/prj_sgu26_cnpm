const { spawn } = require("node:child_process");
const os = require("node:os");
// No shell, no provider stderr in errors/logs, no inherited application secrets.
function runProcess(executable, args, input, { signal, timeoutMs, maxBytes, launch = spawn } = {}) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new Error("TTS_CANCELLED"));
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 120000 || !Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > 16 * 1024 * 1024) return reject(new Error("TTS_PROCESS_OPTIONS_INVALID"));
    let child, timer, force, failure, size = 0, closed = false;
    const chunks = [];
    const stop = code => {
      if (failure || closed) return;
      failure = code; child.kill("SIGTERM");
      force = setTimeout(() => child.kill("SIGKILL"), 250);
    };
    const abort = () => stop("TTS_CANCELLED");
    try {
      child = launch(executable, args, { shell: false, windowsHide: true, cwd: os.tmpdir(), stdio: ["pipe", "pipe", "pipe"],
        env: { PATH: process.env.PATH || "", ...(process.env.SystemRoot ? { SystemRoot: process.env.SystemRoot } : {}),
          LANG: "C.UTF-8", OMP_NUM_THREADS: "1", OPENBLAS_NUM_THREADS: "1" } });
    } catch { return reject(new Error("TTS_PROCESS_FAILED")); }
    child.stdout.on("data", bytes => {
      if (failure) return;
      size += bytes.length;
      if (size > maxBytes) stop("TTS_OUTPUT_TOO_LARGE"); else chunks.push(bytes);
    });
    child.stderr.resume();
    child.on("error", () => { failure ||= "TTS_PROCESS_FAILED"; });
    child.stdin.on("error", () => stop("TTS_PROCESS_FAILED"));
    child.once("close", code => {
      closed = true;
      clearTimeout(timer); clearTimeout(force); signal?.removeEventListener("abort", abort);
      if (failure || code !== 0 || size === 0) reject(new Error(failure || "TTS_PROCESS_FAILED"));
      else resolve(Buffer.concat(chunks));
    });
    signal?.addEventListener("abort", abort, { once: true });
    timer = setTimeout(() => stop("TTS_PROCESS_TIMEOUT"), timeoutMs);
    if (signal?.aborted) abort(); else child.stdin.end(input);
  });
}
module.exports = { runProcess };
