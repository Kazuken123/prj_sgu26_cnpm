// A one-second test tone, NOT speech or proof of multilingual narration quality.
class MockTtsAdapter {
  constructor({ mode = "success" } = {}) { this.mode = mode; this.provider = "MOCK"; }
  async synthesize({ signal }) {
    if (this.mode === "failure") throw new Error("Mock TTS failure");
    if (this.mode === "timeout") return new Promise((resolve, reject) => {
      if (signal.aborted) reject(new Error("aborted"));
      else signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
    });
    const bytes = Buffer.alloc(32044);
    bytes.write("RIFF"); bytes.writeUInt32LE(32036, 4); bytes.write("WAVEfmt ", 8); bytes.writeUInt32LE(16, 16);
    bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(1, 22); bytes.writeUInt32LE(16000, 24);
    bytes.writeUInt32LE(32000, 28); bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34);
    bytes.write("data", 36); bytes.writeUInt32LE(32000, 40);
    for (let i = 0; i < 16000; i++) bytes.writeInt16LE(Math.round(1000 * Math.sin(2 * Math.PI * 440 * i / 16000)), 44 + i * 2);
    return bytes;
  }
}
module.exports = MockTtsAdapter;
