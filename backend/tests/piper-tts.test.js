const { it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises"), os = require("node:os"), path = require("node:path");
const { spawn } = require("node:child_process");
const Piper = require("../adapters/piper-tts"), { runProcess } = require("../adapters/bounded-process");
const { getPiperConfig } = require("../config/piper"), { parseOptions } = require("../scripts/content-worker");
const { inspectWav } = require("../utils/pcm-wav"), manifest = require("../runtime/piper-voices.json");
const executable = process.execPath, script = path.resolve(__dirname, "helpers/tts-process-child.js");
it("Piper worker requires explicit exclusive provider and bounded concurrency one, mock contract remains compatible", () => {
  assert.equal(parseOptions(["--piper"]).ttsProvider, "PIPER"); assert.equal(parseOptions(["--mock"]).ttsProvider, undefined);
  for (const args of [[], ["--piper", "--mock"], ["--piper", "--piper"], ["--piper", "--concurrency", "2"]]) assert.throws(() => parseOptions(args));
});
it("Piper configuration needs explicit absolute paths and a finite deadline, never an implicit provider", () => {
  for (const env of [{}, { PIPER_PYTHON: "python", PIPER_FFMPEG: executable, PIPER_MODEL_DIR: os.tmpdir() },
    ...["0", "NaN", "120001", "1.5"].map(PIPER_TIMEOUT_MS => ({ PIPER_PYTHON: executable, PIPER_FFMPEG: executable, PIPER_MODEL_DIR: os.tmpdir(), PIPER_TIMEOUT_MS }))]) assert.throws(() => getPiperConfig(env));
  assert.equal(getPiperConfig({ PIPER_PYTHON: executable, PIPER_FFMPEG: executable, PIPER_MODEL_DIR: os.tmpdir() }).timeoutMs, 60000);
});
it("bounded child sends exact text via stdin, without a shell, arguments or inherited application secrets", async () => {
  let options, args;
  const text = "Tiếng Việt & <tag> $(echo secret); --model wrong\nSecond line";
  const result = await runProcess(executable, [script, "echo"], Buffer.from(text), { timeoutMs: 3000, maxBytes: 1000,
    launch: (file, values, config) => { options = config; args = values; return spawn(file, values, config); } });
  assert.equal(result.toString(), text); assert.equal(options.shell, false); assert.equal(options.windowsHide, true);
  assert.equal(options.env.DB_PASSWORD, undefined); assert.equal(options.env.JWT_SECRET, undefined); assert.ok(!args.join(" ").includes(text));
});
it("spawn failure, provider failure and oversized output are bounded and hide stderr and paths", async () => {
  for (const [file, args, maxBytes] of [[path.join(os.tmpdir(), "missing-tts-executable"), [], 1024], [executable, [script, "failure"], 1024], [executable, [script, "oversized"], 10]]) {
    await assert.rejects(runProcess(file, args, Buffer.from("test"), { timeoutMs: 3000, maxBytes }), e => /^TTS_/.test(e.message) && !e.message.includes("private") && !e.message.includes(os.tmpdir()));
  }
});
it("deadline force-kills an uncooperative child and waits for close before rejecting", async () => {
  let child;
  await assert.rejects(runProcess(executable, [script, "stubborn"], Buffer.alloc(0), { timeoutMs: 1000, maxBytes: 1024,
    launch: (...args) => { child = spawn(...args); return child; } }), /TTS_PROCESS_TIMEOUT/);
  assert.notEqual(child.signalCode, null); assert.throws(() => process.kill(child.pid, 0));
});
it("external abort terminates the child; pre-aborted calls never spawn", async () => {
  const controller = new AbortController(); let child, started;
  const ready = new Promise(resolve => { started = resolve; });
  const result = runProcess(executable, [script, "stubborn"], Buffer.alloc(0), { signal: controller.signal, timeoutMs: 5000, maxBytes: 1024,
    launch: (...args) => { child = spawn(...args); child.stdout.once("data", started); return child; } });
  await ready; controller.abort(); await assert.rejects(result, /TTS_CANCELLED/); assert.throws(() => process.kill(child.pid, 0));
  await assert.rejects(runProcess(executable, [], Buffer.alloc(0), { signal: controller.signal, launch: () => assert.fail("pre-aborted") }), /TTS_CANCELLED/);
});
it("invalid process bounds and missing Piper CLI configuration fail before any work", async () => {
  await assert.rejects(runProcess(executable, [], Buffer.alloc(0), { timeoutMs: Infinity, maxBytes: 1, launch: () => assert.fail("bad bounds") }), /TTS_PROCESS_OPTIONS_INVALID/);
  const { fork } = require("node:child_process");
  const child = fork(path.resolve(__dirname, "../scripts/content-worker.js"), ["--piper"], { cwd: os.tmpdir(), windowsHide: true,
    env: { ...process.env, PIPER_MODEL_DIR: "" }, stdio: ["ignore", "pipe", "pipe", "ipc"] });
  let output = ""; child.stdout.resume(); child.stderr.on("data", bytes => { output += bytes; });
  assert.equal(await new Promise(resolve => child.once("exit", resolve)), 1);
  assert.match(output, /WORKER_TTS_CONFIGURATION_INVALID/); assert.ok(!output.includes("DB_PASSWORD"));
});
async function fixture(t, run) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "tcv-piper-unit-"));
  t.after(async () => { if (path.dirname(root) === os.tmpdir() && path.basename(root).startsWith("tcv-piper-unit-")) await fs.rm(root, { recursive: true, force: true }); });
  for (const voice of Object.values(manifest.voices)) {
    await fs.writeFile(path.join(root, voice.model), "UNIT TEST MODEL PLACEHOLDER");
    await fs.writeFile(path.join(root, voice.model + ".json"), JSON.stringify({ audio: { sample_rate: voice.sampleRate }, num_speakers: 1 }));
  }
  return new Piper({ modelDir: root, python: executable, ffmpeg: executable, timeoutMs: 5000 }, run);
}
it("Piper selects VI/EN models, performs explicit resampling and returns validated canonical WAV", async t => {
  const calls = [], adapter = await fixture(t, async (file, args, bytes, options) => {
    calls.push({ args, bytes, options }); return Buffer.alloc(args.includes("piper") ? 44100 : 32000);
  });
  await adapter.assertConfigured();
  for (const languageCode of ["vi", "en"]) {
    const bytes = await adapter.synthesize({ text: "Reviewed script", languageCode, signal: new AbortController().signal });
    assert.equal(inspectWav(bytes).duration, 1); assert.equal(calls.at(-2).bytes.toString(), "Reviewed script\n");
    assert.ok(calls.at(-2).args.includes(path.join(adapter.config.modelDir, manifest.voices[languageCode].model)));
    assert.ok(calls.at(-1).args.includes("22050")); assert.ok(calls.at(-1).args.includes("16000"));
    assert.ok(calls.at(-1).options.timeoutMs <= 5000);
  }
  assert.equal(adapter.provider, "PIPER");
});
it("unsupported language, bad metadata, absent model and invalid converted PCM cannot publish audio", async t => {
  const adapter = await fixture(t, async () => { throw Error("private path"); });
  for (const input of [{ text: "test", languageCode: "fr" }, { text: "", languageCode: "vi" }, { text: "test", languageCode: "constructor" }]) await assert.rejects(adapter.synthesize(input), /^Error: PIPER_TTS_FAILED$/);
  await fs.writeFile(path.join(adapter.config.modelDir, manifest.voices.vi.model + ".json"), '{"audio":{"sample_rate":8000},"num_speakers":1}');
  await assert.rejects(adapter.synthesize({ text: "test", languageCode: "vi" }), /PIPER_TTS_FAILED/);
  adapter.run = async () => Buffer.from([1]);
  await assert.rejects(adapter.synthesize({ text: "test", languageCode: "en" }), /PIPER_TTS_FAILED/);
  await fs.unlink(path.join(adapter.config.modelDir, manifest.voices.en.model)); await assert.rejects(adapter.assertConfigured());
});
