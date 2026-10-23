// Test/demo adapter only. Hashed bag-of-words vectors make retrieval deterministic
// for controlled fixtures; they say NOTHING about the quality of a real model.
const { createHash } = require("node:crypto");
function tokens(text) {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase()
    .split(/[^a-z0-9]+/).filter(token => token.length > 1);
}
class MockEmbeddingAdapter {
  constructor({ model = "mock-hash-v1", dimensions = 256, mode = "success" } = {}) {
    this.model = model; this.dimensions = dimensions; this.mode = mode; this.provider = "MOCK"; this.calls = 0;
  }
  vector(text) {
    const vector = new Array(this.dimensions).fill(0);
    for (const token of tokens(text)) vector[createHash("sha256").update(token).digest().readUInt32BE(0) % this.dimensions] += 1;
    if (vector.every(value => value === 0)) vector[0] = 1;
    const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
    return vector.map(value => value / norm);
  }
  async embed(texts, { signal } = {}) {
    this.calls++;
    if (this.mode === "timeout") return new Promise((resolve, reject) => {
      if (signal?.aborted) reject(new Error("aborted"));
      else signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
    });
    if (this.mode === "failure") throw new Error("Mock embedding failure");
    const vectors = texts.map(text => this.vector(text));
    if (this.mode === "nan") vectors[0][0] = Number.NaN;
    if (this.mode === "short") vectors[0] = vectors[0].slice(1);
    if (this.mode === "missing") vectors.pop();
    return { model: this.mode === "wrong-model" ? this.model + "-other" : this.model, vectors };
  }
}
module.exports = MockEmbeddingAdapter;
