// Offline artifact preparation only. No database configuration or worker startup.
const fs = require("node:fs/promises");
const path = require("node:path");
const { createHash, randomUUID } = require("node:crypto");
const { spawn } = require("node:child_process");
const { gunzipSync } = require("node:zlib");
const { loadInput, LANGUAGE_CODES } = require("../config/additional-pois-input");
const { inspectWav } = require("../utils/pcm-wav");
const { runProcess } = require("../adapters/bounded-process");
const PiperTtsAdapter = require("../adapters/piper-tts");

const ROOT = path.resolve(__dirname, "../..");
const UUID_WAV = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}\.wav$/;
const hash = value => createHash("sha256").update(value).digest("hex");

function parseArgs(argv) {
  const options = { mediaRoot: path.join(ROOT, "data/demo/additional-media"), output: path.join(ROOT, "data/demo/additional") };
  const seen = new Set();
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === "--pin-manifest") {
      if (seen.has(flag)) throw new Error("INVALID_AUDIO_GENERATION_ARGUMENTS");
      seen.add(flag); options.pinManifest = true; continue;
    }
    if (!["--media-root", "--output"].includes(flag) || seen.has(flag) || !argv[i + 1] || argv[i + 1].startsWith("--")) throw new Error("INVALID_AUDIO_GENERATION_ARGUMENTS");
    seen.add(flag);
    options[flag === "--media-root" ? "mediaRoot" : "output"] = path.resolve(argv[++i]);
  }
  return options;
}

async function writeJson(filename, data) {
  const temporary = filename + "." + randomUUID() + ".part";
  await fs.writeFile(temporary, JSON.stringify(data, null, 2) + "\n", { flag: "wx" });
  try { await fs.rename(temporary, filename); }
  finally { await fs.rm(temporary, { force: true }); }
}

async function readJson(filename) {
  try { return JSON.parse(await fs.readFile(filename, "utf8")); }
  catch (error) { if (error.code === "ENOENT") return null; throw new Error("INVALID_AUDIO_GENERATION_CHECKPOINT"); }
}

async function modelProvenance(adapter) {
  const version = (await runProcess(adapter.config.python, ["-c", "from importlib.metadata import version; print(version('piper-tts'))"],
    Buffer.alloc(0), { timeoutMs: 30000, maxBytes: 128 })).toString("utf8").trim();
  if (version !== "1.8.0") throw new Error("ADDITIONAL_PIPER_VERSION_MISMATCH");
  const provenance = {};
  for (const code of LANGUAGE_CODES) {
    const voice = adapter.voices[code];
    if (!voice) throw new Error("ADDITIONAL_PIPER_VOICE_MISSING");
    const modelPath = await adapter.modelFor(voice);
    const modelSha256 = hash(await fs.readFile(modelPath));
    const configSha256 = hash(await fs.readFile(modelPath + ".json"));
    if (modelSha256 !== voice.sha256 || (voice.configSha256 && configSha256 !== voice.configSha256)) throw new Error("ADDITIONAL_PIPER_MODEL_CHECKSUM_MISMATCH");
    provenance[code] = {
      provider: "PIPER", engineVersion: version,
      modelKey: path.basename(voice.model, ".onnx"), modelSha256,
      modelConfigSha256: configSha256,
      modelRevision: require("../runtime/piper-voices.json").revision,
      speakerId: voice.speakerId ?? 0,
      origin: "PIPER_GENERATED_FROM_ADDITIONAL_POI_SCRIPT",
    };
  }
  return provenance;
}

async function canResume(file, { poiId, languageCode, sourceVersion, scriptSha256, provenance, mediaRoot }) {
  if (!file || !UUID_WAV.test(file.key) || file.poiId !== poiId || file.languageCode !== languageCode ||
      file.sourceVersion !== sourceVersion || file.scriptSha256 !== scriptSha256 ||
      Object.entries(provenance).some(([key, value]) => file[key] !== value)) return false;
  try {
    const bytes = await fs.readFile(path.join(mediaRoot, file.key)), wav = inspectWav(bytes);
    return file.sha256 === hash(bytes) && file.fileSize === wav.fileSize && file.duration === wav.duration;
  } catch { return false; }
}

async function packageMedia(mediaRoot, filename, keys, launch = spawn) {
  if (keys.length !== 120 || new Set(keys).size !== 120 || keys.some(key => !UUID_WAV.test(key))) throw new Error("ADDITIONAL_ARCHIVE_FILE_SET_INVALID");
  const temporary = filename + "." + randomUUID() + ".part";
  try {
    await new Promise((resolve, reject) => {
      const child = launch("tar", ["-czf", temporary, "-C", mediaRoot, "--", ...keys],
        { shell: false, windowsHide: true, stdio: ["ignore", "ignore", "pipe"] });
      child.stderr.resume();
      child.once("error", () => reject(new Error("ADDITIONAL_MEDIA_TAR_FAILED")));
      child.once("close", code => code === 0 ? resolve() : reject(new Error("ADDITIONAL_MEDIA_TAR_FAILED")));
    });
    if (!(await fs.stat(temporary)).isFile()) throw new Error("ADDITIONAL_MEDIA_TAR_FAILED");
    await fs.rename(temporary, filename);
  } finally { await fs.rm(temporary, { force: true }); }
}

function verifyArchive(archive, manifest) {
  const fail = () => { throw new Error("ADDITIONAL_ARCHIVE_FILE_MISMATCH"); };
  const maximum = manifest.files.reduce((total, file) => total + 512 + Math.ceil(file.fileSize / 512) * 512, 10240);
  let tar;
  try { tar = gunzipSync(archive, { maxOutputLength: maximum }); } catch { fail(); }
  const expected = new Map(manifest.files.map(file => [file.key, file]));
  const seen = new Set();
  let offset = 0, terminated = false;
  const string = bytes => bytes.toString("ascii").split("\0")[0];
  const octal = bytes => {
    const value = string(bytes).trim();
    if (!/^[0-7]+$/.test(value)) fail();
    return Number.parseInt(value, 8);
  };
  while (offset + 512 <= tar.length) {
    const header = tar.subarray(offset, offset + 512);
    if (header.every(byte => byte === 0)) {
      if (tar.length - offset < 1024 || !tar.subarray(offset).every(byte => byte === 0)) fail();
      terminated = true; break;
    }
    const key = string(header.subarray(0, 100)), file = expected.get(key);
    const size = octal(header.subarray(124, 136));
    let checksum = 0;
    for (let i = 0; i < 512; i++) checksum += i >= 148 && i < 156 ? 32 : header[i];
    if (checksum !== octal(header.subarray(148, 156)) || !file || seen.has(key) ||
        string(header.subarray(345, 500)) || ![0, 48].includes(header[156]) || size !== file.fileSize ||
        offset + 512 + size > tar.length) fail();
    const bytes = tar.subarray(offset + 512, offset + 512 + size);
    if (hash(bytes) !== file.sha256) fail();
    seen.add(key); offset += 512 + Math.ceil(size / 512) * 512;
  }
  if (!terminated || seen.size !== 120) fail();
}

async function pinManifest(manifestPath, mediaRoot, input, validatorPath = path.resolve(__dirname, "../config/additional-assets.js")) {
  input ??= await loadInput();
  const bytes = await fs.readFile(manifestPath);
  const manifest = require("../config/additional-assets").validate(JSON.parse(bytes.toString("utf8")), input);
  for (const file of manifest.files) {
    if (!await canResume(file, { ...file, provenance: {}, mediaRoot })) throw new Error("ADDITIONAL_AUDIO_CHANGED_BEFORE_PINNING");
  }
  const archive = await fs.readFile(path.join(path.dirname(manifestPath), "media.tar.gz"));
  verifyArchive(archive, manifest);
  const digest = hash(bytes), source = await fs.readFile(validatorPath, "utf8");
  const pattern = /^const DIGEST = (?:null|"[a-f0-9]{64}"|'[a-f0-9]{64}');$/gm;
  if ([...source.matchAll(pattern)].length !== 1) throw new Error("ADDITIONAL_MANIFEST_PIN_SOURCE_UNEXPECTED");
  const pinned = source.replace(pattern, `const DIGEST = "${digest}";`);
  const temporary = validatorPath + "." + randomUUID() + ".part";
  await fs.writeFile(temporary, pinned, { flag: "wx" });
  try { await fs.rename(temporary, validatorPath); }
  finally { await fs.rm(temporary, { force: true }); }
  return digest;
}

async function generate(options, { input = null, adapter = null, provenance = null, packageImpl = packageMedia, validatorPath, log = () => {} } = {}) {
  input ??= await loadInput();
  adapter ??= new PiperTtsAdapter();
  if (adapter.config?.voiceSet !== "demo15") throw new Error("ADDITIONAL_AUDIO_REQUIRES_DEMO15_VOICES");
  await adapter.assertConfigured();
  provenance ??= await modelProvenance(adapter);
  if (input.pois.length !== 8 || input.pois.some(poi => LANGUAGE_CODES.some(code => !poi.translations[code]?.audioScript)) ||
      LANGUAGE_CODES.some(code => !provenance[code])) throw new Error("ADDITIONAL_AUDIO_INPUT_INCOMPLETE");
  const { mediaRoot, output } = options;
  await fs.mkdir(mediaRoot, { recursive: true }); await fs.mkdir(output, { recursive: true });
  const checkpointPath = path.join(mediaRoot, "generation-progress.json");
  const previous = await readJson(checkpointPath) ?? await readJson(path.join(output, "audio-manifest.json"));
  if (previous && (previous.datasetId !== input.datasetId || previous.sourceSha256 !== input.sourceSha256 || !Array.isArray(previous.files))) throw new Error("ADDITIONAL_GENERATION_SOURCE_CHANGED");
  const previousFiles = previous?.files ?? [];
  if (new Set(previousFiles.map(file => file.key)).size !== previousFiles.length ||
      new Set(previousFiles.map(file => file.poiId + ":" + file.languageCode)).size !== previousFiles.length) throw new Error("INVALID_AUDIO_GENERATION_CHECKPOINT");
  const manifest = {
    datasetId: input.datasetId, sourceSha256: input.sourceSha256,
    mode: "PREPARED_PIPER_WAV_CANONICAL_PCM_16000_MONO_S16LE",
    newSpeechFiles: 120, independentNativeLanguageReview: false, files: [],
  };
  let generated = 0, resumed = 0;
  for (const poi of input.pois) {
    for (const languageCode of LANGUAGE_CODES) {
      const text = poi.translations[languageCode].audioScript;
      const scriptSha256 = hash(text);
      const prior = previousFiles.find(file => file.poiId === poi.poiId && file.languageCode === languageCode);
      const context = { poiId: poi.poiId, languageCode, sourceVersion: poi.sourceVersion, scriptSha256, provenance: provenance[languageCode], mediaRoot };
      let file;
      if (await canResume(prior, context)) { file = prior; resumed++; }
      else {
        const bytes = await adapter.synthesize({ text, languageCode }), wav = inspectWav(bytes);
        const key = randomUUID() + ".wav";
        await fs.writeFile(path.join(mediaRoot, key), bytes, { flag: "wx" });
        file = { poiId: poi.poiId, languageCode, sourceVersion: poi.sourceVersion, key,
          sha256: hash(bytes), scriptSha256, fileSize: wav.fileSize, duration: wav.duration,
          pcmSha256: hash(bytes.subarray(44)), ...provenance[languageCode] };
        generated++;
      }
      manifest.files.push(file);
      await writeJson(checkpointPath, manifest);
      log({ phase: "AUDIO_PREPARED", completed: manifest.files.length, total: 120, poiId: poi.poiId, languageCode, resumed: file === prior });
    }
  }
  // Recheck every artifact immediately before packaging; no partial manifest is published.
  for (const file of manifest.files) {
    if (!await canResume(file, { ...file, provenance: provenance[file.languageCode], mediaRoot })) throw new Error("ADDITIONAL_AUDIO_CHANGED_BEFORE_PACKAGING");
  }
  await packageImpl(mediaRoot, path.join(output, "media.tar.gz"), manifest.files.map(file => file.key));
  require("../config/additional-assets").validate(manifest, input);
  const manifestPath = path.join(output, "audio-manifest.json");
  await writeJson(manifestPath, manifest);
  const pinnedManifestSha256 = options.pinManifest ? await pinManifest(manifestPath, mediaRoot, input, validatorPath) : null;
  return { outcome: "PACKAGED", files: manifest.files.length, generated, resumed,
    manifestSha256: hash(await fs.readFile(manifestPath)),
    archiveSha256: hash(await fs.readFile(path.join(output, "media.tar.gz"))),
    ...(pinnedManifestSha256 ? { pinnedManifestSha256 } : {}) };
}

if (require.main === module) {
  Promise.resolve().then(() => generate(parseArgs(process.argv.slice(2)), { log: value => console.log(JSON.stringify(value)) }))
    .then(value => console.log(JSON.stringify(value)))
    .catch(() => { console.error("ADDITIONAL_AUDIO_GENERATION_FAILED_INSPECT_OFFLINE_CONFIGURATION"); process.exitCode = 1; });
}

module.exports = { parseArgs, canResume, modelProvenance, packageMedia, verifyArchive, pinManifest, generate };
