const fs = require("node:fs/promises"), path = require("node:path"), { createHash } = require("node:crypto");
const { inspectWav } = require("../utils/pcm-wav");
const DIGEST = "50f1a5f356715209299505929dfd5113abccf5c3ee26d6d8f7c2acf5e0abb6a6";
const SOURCE = "ade1868b3f7f55021176a5d6ec7414d81d0efeb9dc9d35778e15d067a10fd208";
const codes = ["de", "es", "it", "pt-BR", "nl", "pl", "cs", "tr"];
function parse(bytes) {
  if (createHash("sha256").update(bytes).digest("hex") !== DIGEST) throw Error("DEMO15_AUDIO_MANIFEST_CHANGED");
  const data = JSON.parse(bytes.toString("utf8"));
  if (data.datasetId !== "TCV_DEMO_15_LANG_EXTENSION_V1" || data.extensionSha256 !== SOURCE || data.files?.length !== 80 ||
      new Set(data.files.map(f => f.key)).size !== 80 || new Set(data.files.map(f => f.poiId + ":" + f.languageCode)).size !== 80 ||
      data.files.some(f => !Number.isInteger(f.poiId) || f.poiId < 1 || f.poiId > 10 || !codes.includes(f.languageCode) ||
        f.sourceVersion !== 1 || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}\.wav$/.test(f.key) ||
        !/^[a-f0-9]{64}$/.test(f.sha256) || !/^[a-f0-9]{64}$/.test(f.scriptSha256) || !Number.isSafeInteger(f.fileSize) || f.fileSize <= 44 ||
        !Number.isSafeInteger(f.duration) || f.duration < 1)) throw Error("INVALID_DEMO15_AUDIO_MANIFEST");
  return data;
}
async function load() { return parse(await fs.readFile(path.resolve(__dirname, "../../data/demo/fifteen/audio-manifest.json"))); }
async function verify(media, input) {
  const data = await load();
  for (const file of data.files) {
    if (input) {
      const poi = input.manifest.pois.find(p => p.poiId === file.poiId), script = poi?.translations[file.languageCode]?.audioScript;
      if (!script || createHash("sha256").update(script).digest("hex") !== file.scriptSha256 || poi.sourceVersion !== file.sourceVersion) throw Error("DEMO15_AUDIO_TEXT_MISMATCH");
    }
    const bytes = await media.get(file.key), wav = inspectWav(bytes);
    if (wav.fileSize !== file.fileSize || wav.duration !== file.duration || createHash("sha256").update(bytes).digest("hex") !== file.sha256) throw Error("DEMO15_AUDIO_FILE_MISMATCH");
  }
  return data;
}
module.exports = { DIGEST, parse, load, verify };
