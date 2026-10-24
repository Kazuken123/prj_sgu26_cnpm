const path = require("node:path");
function getPiperConfig(env = process.env) {
  const python = env.PIPER_PYTHON, ffmpeg = env.PIPER_FFMPEG, modelDir = env.PIPER_MODEL_DIR;
  if (![python, ffmpeg, modelDir].every(value => typeof value === "string" && path.isAbsolute(value))) throw new Error("PIPER_CONFIGURATION_REQUIRED");
  const voiceSet = env.PIPER_VOICE_SET ?? "vi-en", resourceDir = env.PIPER_RESOURCE_DIR;
  if (!["vi-en", "demo7", "demo15"].includes(voiceSet) || (["demo7", "demo15"].includes(voiceSet) &&
      (typeof resourceDir !== "string" || !path.isAbsolute(resourceDir)))) throw new Error("INVALID_PIPER_VOICE_SET");
  const timeoutMs = env.PIPER_TIMEOUT_MS === undefined ? 60000 : Number(env.PIPER_TIMEOUT_MS);
  if (!/^[1-9]\d*$/.test(String(timeoutMs)) || !Number.isSafeInteger(timeoutMs) || timeoutMs > 120000) throw new Error("INVALID_PIPER_TIMEOUT");
  return { python, ffmpeg, modelDir, timeoutMs, voiceSet, resourceDir };
}
module.exports = { getPiperConfig };
