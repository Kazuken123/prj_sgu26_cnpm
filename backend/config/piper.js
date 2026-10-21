const path = require("node:path");
function getPiperConfig(env = process.env) {
  const python = env.PIPER_PYTHON, ffmpeg = env.PIPER_FFMPEG, modelDir = env.PIPER_MODEL_DIR;
  if (![python, ffmpeg, modelDir].every(value => typeof value === "string" && path.isAbsolute(value))) throw new Error("PIPER_CONFIGURATION_REQUIRED");
  const timeoutMs = env.PIPER_TIMEOUT_MS === undefined ? 60000 : Number(env.PIPER_TIMEOUT_MS);
  if (!/^[1-9]\d*$/.test(String(timeoutMs)) || !Number.isSafeInteger(timeoutMs) || timeoutMs > 120000) throw new Error("INVALID_PIPER_TIMEOUT");
  return { python, ffmpeg, modelDir, timeoutMs };
}
module.exports = { getPiperConfig };
