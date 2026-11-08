const fs = require("node:fs/promises");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { inspectWav } = require("../utils/pcm-wav");

// A generated, verified package must supply its audited manifest digest here.
// Until generation is complete, deployment fails closed.
const DIGEST = "2e997311aca2eace7268d0b043c7fed27354dd982120374b86b77bc79da227db";
const DATASET_ID = "TCV_ADDITIONAL_POIS_V1";
const CODES = ["vi", "en", "zh-Hans", "ko", "ja", "ru", "fr", "de", "es", "it", "pt-BR", "nl", "pl", "cs", "tr"];
const SHA256 = /^[a-f0-9]{64}$/;
const KEY = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}\.wav$/;
const hash = value => createHash("sha256").update(value).digest("hex");

function validate(data, input) {
  if (!data || data.datasetId !== DATASET_ID || !SHA256.test(data.sourceSha256 || "") ||
      !Array.isArray(data.files) || data.files.length !== 120 ||
      new Set(data.files.map(file => file?.key)).size !== 120 ||
      new Set(data.files.map(file => file?.poiId + ":" + file?.languageCode)).size !== 120 ||
      data.files.some(file => !file || !Number.isInteger(file.poiId) || file.poiId < 11 || file.poiId > 18 ||
        !CODES.includes(file.languageCode) || file.sourceVersion !== 1 || !KEY.test(file.key || "") ||
        !SHA256.test(file.sha256 || "") || !SHA256.test(file.scriptSha256 || "") ||
        !Number.isSafeInteger(file.fileSize) || file.fileSize <= 44 || file.fileSize > 10 * 1024 * 1024 ||
        (file.fileSize - 44) % 2 !== 0 || !Number.isSafeInteger(file.duration) ||
        file.duration < 1 || file.duration !== Math.ceil((file.fileSize - 44) / 32000))) {
    throw new Error("INVALID_ADDITIONAL_AUDIO_MANIFEST");
  }
  if (input) {
    if (input.datasetId !== DATASET_ID || input.sourceSha256 !== data.sourceSha256 || input.pois?.length !== 8) {
      throw new Error("ADDITIONAL_AUDIO_SOURCE_MISMATCH");
    }
    for (const file of data.files) {
      const poi = input.pois.find(row => row.poiId === file.poiId);
      const script = poi?.translations[file.languageCode]?.audioScript;
      if (!script || poi.sourceVersion !== file.sourceVersion || hash(script) !== file.scriptSha256) {
        throw new Error("ADDITIONAL_AUDIO_TEXT_MISMATCH");
      }
    }
  }
  return data;
}

function parse(bytes, input) {
  if (DIGEST === null) throw new Error("ADDITIONAL_AUDIO_MANIFEST_NOT_GENERATED");
  if (hash(bytes) !== DIGEST) throw new Error("ADDITIONAL_AUDIO_MANIFEST_CHANGED");
  return validate(JSON.parse(bytes.toString("utf8")), input);
}
async function load(input) {
  const source = input || await require("./additional-pois-input").loadInput();
  return parse(await fs.readFile(path.resolve(__dirname, "../../data/demo/additional/audio-manifest.json")), source);
}
async function verify(media, input) {
  const data = await load(input);
  for (const file of data.files) {
    const bytes = await media.get(file.key);
    const wav = inspectWav(bytes);
    if (wav.fileSize !== file.fileSize || wav.duration !== file.duration || hash(bytes) !== file.sha256) {
      throw new Error("ADDITIONAL_AUDIO_FILE_MISMATCH");
    }
  }
  return data;
}

module.exports = { DIGEST, DATASET_ID, CODES, validate, parse, load, verify };
