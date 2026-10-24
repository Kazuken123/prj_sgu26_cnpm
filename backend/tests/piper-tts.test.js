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
async function fixture(t, run, voiceSet) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "tcv-piper-unit-"));
  t.after(async () => { if (path.dirname(root) === os.tmpdir() && path.basename(root).startsWith("tcv-piper-unit-")) await fs.rm(root, { recursive: true, force: true }); });
  const adapter = new Piper({ modelDir: root, resourceDir: root, voiceSet, python: executable, ffmpeg: executable, timeoutMs: 5000 }, run);
  for (const voice of Object.values(adapter.voices)) {
    await fs.mkdir(path.dirname(path.join(root, voice.model)), { recursive: true });
    await fs.writeFile(path.join(root, voice.model), "UNIT TEST MODEL PLACEHOLDER");
    await fs.writeFile(path.join(root, voice.model + ".json"), JSON.stringify({ audio: { sample_rate: voice.sampleRate },
      num_speakers: voice.numSpeakers ?? 1, phoneme_type: voice.phonemeType,
      speaker_id_map: voice.speakerName ? { [voice.speakerName]: voice.speakerId } : {} }));
  }
  return adapter;
}
it("demo7 is explicit and requires an absolute resource directory; VI/EN remains the default", () => {
  const env = { PIPER_PYTHON: executable, PIPER_FFMPEG: executable, PIPER_MODEL_DIR: os.tmpdir() };
  assert.equal(getPiperConfig(env).voiceSet, "vi-en");
  for (const extra of [{ PIPER_VOICE_SET: "all" }, { PIPER_VOICE_SET: "demo7" }, { PIPER_VOICE_SET: "demo7", PIPER_RESOURCE_DIR: "relative" }]) {
    assert.throws(() => getPiperConfig({ ...env, ...extra }));
  }
  assert.equal(getPiperConfig({ ...env, PIPER_VOICE_SET: "demo7", PIPER_RESOURCE_DIR: os.tmpdir() }).voiceSet, "demo7");
});
it("demo7 uses the checked offline helper and Japanese female speaker without putting script in arguments", async t => {
  const calls = [], adapter = await fixture(t, async (file, args, bytes, options) => {
    calls.push({ args, bytes, options });
    return args.includes("--check") ? Buffer.from("PIPER_RUNTIME_READY\n") : Buffer.alloc(args.includes("--model") ? 44100 : 32000);
  }, "demo7");
  await adapter.assertConfigured(); assert.ok(calls[0].args.includes(adapter.config.resourceDir));
  for (const languageCode of ["vi", "en", "zh-Hans", "ko", "ja", "ru", "fr"]) {
    assert.equal(inspectWav(await adapter.synthesize({ text: "Reviewed script", languageCode })).duration, 1);
    const speech = calls.at(-2);
    assert.ok(speech.args[0].endsWith("piper-synthesize.py"));
    assert.equal(speech.args[speech.args.indexOf("--speaker") + 1], "0");
    assert.equal(speech.bytes.toString(), "Reviewed script\n");
    assert.ok(!speech.args.join(" ").includes("Reviewed script"));
  }
});
it("demo15 is opt-in and retains seven old voices and the selected Japanese female speaker", async t => {
  const env = { PIPER_PYTHON: executable, PIPER_FFMPEG: executable, PIPER_MODEL_DIR: os.tmpdir(), PIPER_VOICE_SET: "demo15" };
  assert.throws(() => getPiperConfig(env));
  assert.throws(() => getPiperConfig({ ...env, PIPER_RESOURCE_DIR: "relative" }));
  assert.equal(getPiperConfig({ ...env, PIPER_RESOURCE_DIR: os.tmpdir() }).voiceSet, "demo15");
  const calls = [], adapter = await fixture(t, async (file, args, bytes) => {
    calls.push({ args, bytes });
    return args.includes("--check") ? Buffer.from("PIPER_RUNTIME_READY\n") : Buffer.alloc(args.includes("--model") ? 44100 : 32000);
  }, "demo15");
  const seven = await fixture(t, async () => Buffer.alloc(0), "demo7");
  for (const [code, voice] of Object.entries(seven.voices)) assert.deepEqual(adapter.voices[code], voice);
  assert.equal(Object.keys(adapter.voices).length, 15);
  assert.equal(adapter.voices.ja.speakerName, "female"); assert.equal(adapter.voices.ja.speakerId, 0);
  await adapter.assertConfigured();
  for (const languageCode of ["de", "es", "it", "pt-BR", "nl", "pl", "cs", "tr"]) {
    assert.equal(inspectWav(await adapter.synthesize({ text: "Reviewed script", languageCode })).duration, 1);
    assert.ok(calls.at(-2).args[0].endsWith("piper-synthesize.py"));
    assert.equal(calls.at(-2).bytes.toString(), "Reviewed script\n");
    assert.ok(!calls.at(-2).args.join(" ").includes("Reviewed script"));
  }
  for (const languageCode of ["pt", "pt-br", "pt-PT", "constructor", "sv"]) {
    await assert.rejects(adapter.synthesize({ text: "test", languageCode }), /PIPER_TTS_FAILED/);
  }
  await assert.rejects(seven.synthesize({ text: "test", languageCode: "de" }), /PIPER_TTS_FAILED/);
});
it("demo15 rejects missing models and wrong sample rate/phonemizer before spawning", async t => {
  const adapter = await fixture(t, () => assert.fail("Invalid metadata must not spawn"), "demo15");
  const voice = adapter.voices["pt-BR"], file = path.join(adapter.config.modelDir, voice.model + ".json");
  for (const patch of [{ audio: { sample_rate: 8000 } }, { phoneme_type: "pinyin" }, { num_speakers: 2 }]) {
    await fs.writeFile(file, JSON.stringify({ audio: { sample_rate: 22050 }, phoneme_type: "espeak", num_speakers: 1, ...patch }));
    await assert.rejects(adapter.synthesize({ text: "test", languageCode: "pt-BR" }), /PIPER_TTS_FAILED/);
  }
  await fs.unlink(path.join(adapter.config.modelDir, adapter.voices.de.model));
  await assert.rejects(adapter.assertConfigured());
});
it("speaker count, selected female mapping and phonemizer must match before spawning", async t => {
  const adapter = await fixture(t, () => assert.fail("Do not synthesize invalid models"), "demo7");
  const filename = path.join(adapter.config.modelDir, adapter.voices.ja.model + ".json");
  for (const patch of [{ num_speakers: 1 }, { speaker_id_map: { female: 1, male: 0 } }, { phoneme_type: "espeak" }]) {
    await fs.writeFile(filename, JSON.stringify({ audio: { sample_rate: 22050 }, num_speakers: 2,
      phoneme_type: "japanese", speaker_id_map: { female: 0, male: 1 }, ...patch }));
    await assert.rejects(adapter.synthesize({ text: "test", languageCode: "ja" }), /PIPER_TTS_FAILED/);
  }
});
it("missing offline resources or failed preflight stops demo7 startup", async t => {
  const adapter = await fixture(t, async () => Buffer.from("not ready"), "demo7");
  await assert.rejects(adapter.assertConfigured(), /PIPER_RUNTIME_NOT_READY/);
  adapter.run = async () => { throw Error("TTS_PROCESS_FAILED"); };
  await assert.rejects(adapter.assertConfigured(), /TTS_PROCESS_FAILED/);
});
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
