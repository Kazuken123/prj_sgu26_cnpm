const { it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const LocalMedia = require("../adapters/local-media");
const MockTts = require("../adapters/mock-tts");
const { inspectWav, MAX_AUDIO_BYTES } = require("../utils/pcm-wav");
async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "tcv-media-test-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return { root, storage: new LocalMedia({ root }), key: randomUUID() + ".wav", bytes: await new MockTts().synthesize({ signal: new AbortController().signal }) };
}
it("mock TTS produces valid one-second PCM WAV test tone, not an empty or pretend speech file", async t => {
  const f = await fixture(t);
  assert.deepEqual(inspectWav(f.bytes), { duration: 1, fileSize: 32044, contentType: "audio/wav" });
  for (const bytes of [Buffer.alloc(0), Buffer.from("not audio"), f.bytes.subarray(0, f.bytes.length - 1), Buffer.alloc(MAX_AUDIO_BYTES + 1)]) {
    assert.throws(() => inspectWav(bytes), /INVALID_WAV/);
  }
  const corrupt = Buffer.from(f.bytes); corrupt.writeUInt16LE(2, 20); assert.throws(() => inspectWav(corrupt));
});
it("private media persists bytes across adapter instances, rejects overwrite and supports scoped cleanup", async t => {
  const f = await fixture(t); await f.storage.put(f.key, f.bytes);
  const restarted = new LocalMedia({ root: f.root }); assert.deepEqual(await restarted.get(f.key), f.bytes);
  await assert.rejects(f.storage.put(f.key, Buffer.from("replacement")), { code: "EEXIST" });
  assert.deepEqual(await f.storage.get(f.key), f.bytes);
  await f.storage.remove(f.key); await f.storage.remove(f.key); await assert.rejects(f.storage.get(f.key), { code: "ENOENT" });
});
it("media keys cannot traverse directories, use absolute paths or address non-WAV files", async t => {
  const f = await fixture(t);
  for (const key of ["../.env", "/etc/passwd", "C:\\Windows\\win.ini", "%2e%2e%2f.env", f.key + "/x", f.key.toUpperCase(), "x.wav"]) {
    await assert.rejects(f.storage.put(key, f.bytes), /INVALID_MEDIA_KEY/);
    await assert.rejects(f.storage.get(key), /INVALID_MEDIA_KEY/);
    await assert.rejects(f.storage.remove(key), /INVALID_MEDIA_KEY/);
  }
  assert.deepEqual(await fs.readdir(f.root), []);
});
it("media requires a private absolute root and refuses directories as audio files", async t => {
  const f = await fixture(t);
  for (const root of ["", "relative/path"]) {
    await assert.rejects(new LocalMedia({ root }).get(f.key), /MEDIA_ROOT_REQUIRED/);
  }
  await assert.rejects(new LocalMedia({ root: path.resolve(__dirname, "../../frontend") }).location(f.key), /PRIVATE_MEDIA_ROOT_REQUIRED/);
  await fs.mkdir(path.join(f.root, f.key)); await assert.rejects(f.storage.get(f.key), /INVALID_MEDIA_FILE/);
});
it("cancelled media writes leave no published file and oversized input is refused", async t => {
  const f = await fixture(t), controller = new AbortController(); controller.abort();
  await assert.rejects(f.storage.put(f.key, f.bytes, { signal: controller.signal }));
  assert.deepEqual(await fs.readdir(f.root), []);
  await assert.rejects(f.storage.put(f.key, Buffer.alloc(MAX_AUDIO_BYTES + 1)), /INVALID_MEDIA_BYTES/);
});
