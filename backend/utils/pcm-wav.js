const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
// Initial adapter contract: mono 16-bit PCM WAV, 16 kHz, canonical 44-byte header.
// Other provider formats must be converted by their adapter, not guessed here.
function inspectWav(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 46 || bytes.length > MAX_AUDIO_BYTES ||
      bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.readUInt32LE(4) !== bytes.length - 8 ||
      bytes.toString("ascii", 8, 16) !== "WAVEfmt " || bytes.readUInt32LE(16) !== 16 ||
      bytes.readUInt16LE(20) !== 1 || bytes.readUInt16LE(22) !== 1 || bytes.readUInt32LE(24) !== 16000 ||
      bytes.readUInt32LE(28) !== 32000 || bytes.readUInt16LE(32) !== 2 || bytes.readUInt16LE(34) !== 16 ||
      bytes.toString("ascii", 36, 40) !== "data" || bytes.readUInt32LE(40) !== bytes.length - 44 ||
      (bytes.length - 44) % 2 !== 0) throw new Error("INVALID_WAV");
  return { fileSize: bytes.length, duration: Math.ceil((bytes.length - 44) / 32000), contentType: "audio/wav" };
}
module.exports = { inspectWav, MAX_AUDIO_BYTES };
