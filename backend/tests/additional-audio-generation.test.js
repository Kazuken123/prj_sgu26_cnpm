const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const { createHash, randomUUID } = require("node:crypto");
const { EventEmitter } = require("node:events");
const { parseArgs, canResume, packageMedia, pinManifest, generate } = require("../scripts/generate-additional-audio");
const { loadInput, LANGUAGE_CODES } = require("../config/additional-pois-input");

const hash = value => createHash("sha256").update(value).digest("hex");
// A short PCM fixture used only in temporary test directories, never demo assets.
function wavFixture() {
  const wav = Buffer.alloc(364);
  wav.write("RIFF"); wav.writeUInt32LE(wav.length - 8, 4); wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(16000, 24); wav.writeUInt32LE(32000, 28); wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34); wav.write("data", 36); wav.writeUInt32LE(wav.length - 44, 40);
  return wav;
}

test("generation arguments reject unknown, duplicate and missing path flags", () => {
  for (const args of [["--mock"], ["--output"], ["--output", "--media-root"], ["--output", "a", "--output", "b"], ["--pin-manifest", "--pin-manifest"]]) {
    assert.throws(() => parseArgs(args), /INVALID_AUDIO_GENERATION_ARGUMENTS/);
  }
  const parsed = parseArgs(["--media-root", "fixture media", "--output", "fixture output"]);
  assert.equal(parsed.mediaRoot, path.resolve("fixture media"));
  assert.equal(parsed.output, path.resolve("fixture output"));
  assert.equal(parseArgs(["--pin-manifest"]).pinManifest, true);
});

test("resume requires exact script, model provenance, canonical WAV and binary digest", async () => {
  const mediaRoot = await fs.mkdtemp(path.join(os.tmpdir(), "tcv-generation-resume-"));
  try {
    const bytes = wavFixture(), key = randomUUID() + ".wav", provenance = { modelSha256: "model", engineVersion: "1.8.0" };
    const file = { poiId: 11, languageCode: "vi", sourceVersion: 1, scriptSha256: hash("script"), key,
      sha256: hash(bytes), duration: 1, fileSize: bytes.length, ...provenance };
    const context = { ...file, provenance, mediaRoot };
    await fs.writeFile(path.join(mediaRoot, key), bytes);
    assert.equal(await canResume(file, context), true);
    assert.equal(await canResume(file, { ...context, scriptSha256: hash("changed script") }), false);
    assert.equal(await canResume(file, { ...context, provenance: { ...provenance, modelSha256: "changed model" } }), false);
    bytes[100] = 1;
    await fs.writeFile(path.join(mediaRoot, key), bytes);
    assert.equal(await canResume(file, context), false);
    assert.equal(await canResume({ ...file, key: "../unsafe.wav" }, context), false);
  } finally { await fs.rm(mediaRoot, { recursive: true, force: true }); }
});

test("tar rejects an incomplete set and surfaces failure without publishing an archive", async () => {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), "tcv-generation-tar-"));
  try {
    const archive = path.join(folder, "media.tar.gz");
    await assert.rejects(packageMedia(folder, archive, [randomUUID() + ".wav"]), /FILE_SET_INVALID/);
    let called = false;
    const keys = Array.from({ length: 120 }, () => randomUUID() + ".wav");
    await assert.rejects(packageMedia(folder, archive, keys, (executable, args, options) => {
      called = true;
      assert.equal(executable, "tar"); assert.equal(options.shell, false); assert.equal(options.windowsHide, true);
      assert.deepEqual(args.slice(2, 5), ["-C", folder, "--"]);
      assert.deepEqual(args.slice(5), keys);
      const child = new EventEmitter(); child.stderr = { resume() {} };
      process.nextTick(() => child.emit("close", 1));
      return child;
    }), /ADDITIONAL_MEDIA_TAR_FAILED/);
    assert.equal(called, true);
    await assert.rejects(fs.stat(archive), { code: "ENOENT" });
  } finally { await fs.rm(folder, { recursive: true, force: true }); }
});

test("interrupted generation resumes verified files and publishes only after packaging", async () => {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), "tcv-generation-interrupted-"));
  try {
    const input = await loadInput(), options = { mediaRoot: path.join(folder, "media"), output: path.join(folder, "output"), pinManifest: true };
    const validatorPath = path.join(folder, "validator.js"), unpinned = "const DIGEST = null;\n";
    await fs.writeFile(validatorPath, unpinned);
    const provenance = Object.fromEntries(LANGUAGE_CODES.map(code => [code, { provider: "TEST_FIXTURE", modelSha256: hash(code) }]));
    let attempts = 0;
    const adapter = { config: { voiceSet: "demo15" }, assertConfigured: async () => {}, synthesize: async () => {
      if (++attempts === 2) throw new Error("SIMULATED_INTERRUPTION");
      return wavFixture();
    } };
    await assert.rejects(generate(options, { input, adapter, provenance, validatorPath }), /SIMULATED_INTERRUPTION/);
    assert.equal(await fs.readFile(validatorPath, "utf8"), unpinned);
    await assert.rejects(fs.stat(path.join(options.output, "audio-manifest.json")), { code: "ENOENT" });
    const checkpoint = JSON.parse(await fs.readFile(path.join(options.mediaRoot, "generation-progress.json"), "utf8"));
    assert.equal(checkpoint.files.length, 1);
    adapter.synthesize = async () => wavFixture();
    let packaged = false;
    const result = await generate(options, { input, adapter, provenance, validatorPath, packageImpl: async (mediaRoot, filename, keys) => {
      assert.equal(keys.length, 120); assert.equal(mediaRoot, options.mediaRoot);
      await assert.rejects(fs.stat(path.join(options.output, "audio-manifest.json")), { code: "ENOENT" });
      assert.equal(await fs.readFile(validatorPath, "utf8"), unpinned);
      await packageMedia(mediaRoot, filename, keys); packaged = true;
    } });
    assert.equal(packaged, true); assert.equal(result.resumed, 1); assert.equal(result.generated, 119);
    const manifest = JSON.parse(await fs.readFile(path.join(options.output, "audio-manifest.json"), "utf8"));
    assert.equal(manifest.files.length, 120);
    assert.equal(manifest.files[0].key, checkpoint.files[0].key);
    assert.equal(result.manifestSha256, hash(await fs.readFile(path.join(options.output, "audio-manifest.json"))));
    assert.equal(result.pinnedManifestSha256, result.manifestSha256);
    assert.equal(await fs.readFile(validatorPath, "utf8"), `const DIGEST = "${result.manifestSha256}";\n`);
    await fs.writeFile(validatorPath, "const DIGEST = unexpected;\n");
    await assert.rejects(pinManifest(path.join(options.output, "audio-manifest.json"), options.mediaRoot, input, validatorPath), /PIN_SOURCE_UNEXPECTED/);
    assert.equal(await fs.readFile(validatorPath, "utf8"), "const DIGEST = unexpected;\n");
    await fs.writeFile(validatorPath, unpinned);
    await fs.writeFile(path.join(options.output, "media.tar.gz"), "CORRUPTED_ARCHIVE");
    await assert.rejects(pinManifest(path.join(options.output, "audio-manifest.json"), options.mediaRoot, input, validatorPath), /ARCHIVE_FILE_MISMATCH/);
    assert.equal(await fs.readFile(validatorPath, "utf8"), unpinned);
  } finally { await fs.rm(folder, { recursive: true, force: true }); }
});
