// Test/demo adapter only. It echoes the top retrieved chunk; it does not detect
// language, judge relevance or resist prompt injection like a real model would.
class MockChatModelAdapter {
  constructor({ mode = "success" } = {}) { this.mode = mode; this.provider = "MOCK"; this.calls = []; }
  async generate({ contexts, prompt, signal }) {
    this.calls.push({ contexts, prompt });
    if (this.mode === "timeout") return new Promise((resolve, reject) => {
      if (signal?.aborted) reject(new Error("aborted"));
      else signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
    });
    if (this.mode === "failure") throw new Error("Mock model failure");
    if (this.mode === "invalid") return { decision: "MAYBE", answer: 42 };
    if (this.mode === "refuse") return { decision: "REFUSE", answer: "[MOCK] Tôi chỉ hỗ trợ thông tin tham quan.", citations: [] };
    if (!contexts.length) return { decision: "NO_CONTEXT", answer: "[MOCK] Kho kiến thức chưa có thông tin về câu hỏi này.", citations: [] };
    if (this.mode === "fabricate") {
      return { decision: "ANSWER", answer: "[MOCK] Xem https://invented.example/fake để biết thêm.", citations: ["999999999"] };
    }
    const top = contexts[0];
    return { decision: "ANSWER", answer: "[MOCK] " + top.text.split(/(?<=[.!?])\s/)[0], citations: [top.chunkId] };
  }
}
module.exports = MockChatModelAdapter;
