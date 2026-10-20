// Test/demo adapter only. Prefixing source text is NOT machine translation.
// No production Service or Router enables this adapter automatically.
class MockTranslationAdapter {
  constructor({ mode = "success" } = {}) { this.mode = mode; this.provider = "MOCK"; }
  async translate({ source, targetLanguage, signal }) {
    if (this.mode === "timeout") return new Promise((resolve, reject) => {
      if (signal.aborted) reject(new Error("aborted"));
      else signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
    });
    if (this.mode === "failure") throw new Error("Mock provider failure");
    return Object.fromEntries(["name", "description", "audioScript"].map(key => [key, `[MOCK ${targetLanguage}] ${source[key]}`]));
  }
}
module.exports = MockTranslationAdapter;
