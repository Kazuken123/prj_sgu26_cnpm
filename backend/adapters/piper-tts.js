const fs = require("node:fs/promises");
const { constants } = require("node:fs");
const path = require("node:path");
const manifest = require("../runtime/piper-voices.json");
const { runProcess } = require("./bounded-process");
const { inspectWav, MAX_AUDIO_BYTES } = require("../utils/pcm-wav");
const { getPiperConfig } = require("../config/piper");
function wavFromPcm(pcm) {
  if (!pcm.length || pcm.length % 2 || pcm.length + 44 > MAX_AUDIO_BYTES) throw new Error("INVALID_PIPER_AUDIO");
  const header = Buffer.alloc(44);
  header.write("RIFF"); header.writeUInt32LE(pcm.length + 36, 4); header.write("WAVEfmt ", 8); header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22); header.writeUInt32LE(16000, 24); header.writeUInt32LE(32000, 28);
  header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34); header.write("data", 36); header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}
class PiperTtsAdapter {
  constructor(config = getPiperConfig(), run = runProcess) { this.config = config; this.run = run; this.provider = "PIPER"; }
  async modelFor(voice) {
    const model = path.join(this.config.modelDir, voice.model);
    const files = await Promise.all([fs.stat(model), fs.stat(model + ".json")]);
    if (!files.every(file => file.isFile())) throw Error("PIPER_MODEL_MISSING");
    if (files[1].size > 65535) throw Error("PIPER_MODEL_CONFIG_MISMATCH");
    const metadata = JSON.parse(await fs.readFile(model + ".json", "utf8"));
    if (metadata.audio?.sample_rate !== voice.sampleRate || metadata.num_speakers !== 1) throw Error("PIPER_MODEL_CONFIG_MISMATCH");
    return model;
  }
  async assertConfigured() {
    await Promise.all([fs.access(this.config.python, constants.X_OK), fs.access(this.config.ffmpeg, constants.X_OK),
      ...Object.values(manifest.voices).map(voice => this.modelFor(voice))]);
  }
  async synthesize({ text, languageCode, signal }) {
    try {
      const voice = Object.hasOwn(manifest.voices, languageCode) ? manifest.voices[languageCode] : null;
      if (!voice || typeof text !== "string" || !text.trim() || Buffer.byteLength(text, "utf8") > 65535 || signal?.aborted) throw Error("INVALID_TTS_INPUT");
      const { python, ffmpeg, timeoutMs } = this.config, model = await this.modelFor(voice);
      const started = Date.now();
      const raw = await this.run(python, ["-m", "piper", "--model", model, "--output-raw"], Buffer.from(text + "\n", "utf8"),
        { signal, timeoutMs, maxBytes: Math.ceil(MAX_AUDIO_BYTES * voice.sampleRate / 16000) });
      if (raw.length % 2 || signal?.aborted) throw Error("INVALID_PIPER_PCM");
      const remaining = timeoutMs - (Date.now() - started);
      if (remaining <= 0) throw Error("TTS_PROCESS_TIMEOUT");
      const pcm = await this.run(ffmpeg, ["-hide_banner", "-loglevel", "error", "-f", "s16le", "-ar", String(voice.sampleRate), "-ac", "1", "-i", "pipe:0",
        "-f", "s16le", "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", "pipe:1"], raw, { signal, timeoutMs: remaining, maxBytes: MAX_AUDIO_BYTES - 44 });
      if (signal?.aborted) throw Error("TTS_CANCELLED");
      const wav = wavFromPcm(pcm); inspectWav(wav); return wav;
    } catch { throw new Error("PIPER_TTS_FAILED"); }
  }
}
module.exports = PiperTtsAdapter;
