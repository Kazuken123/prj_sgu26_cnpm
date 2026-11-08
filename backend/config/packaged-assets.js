const fs = require("node:fs/promises");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { inspectWav } = require("../utils/pcm-wav");
const baseline = require("./staging-dataset");
const additional = require("./additional-assets");
const extraLanguages = require("./demo15-assets");
const hash = value => createHash("sha256").update(value).digest("hex");

async function verify(media) {
  const base = await baseline.load();
  const files = [];
  for (const file of base.files) {
    const text = base.tables.POI_TRANSLATIONS.find(row => row.poi_id === file.poiId && row.language_code === file.languageCode);
    const bytes = await media.get(file.key);
    const wav = inspectWav(bytes);
    if (!text || wav.fileSize !== file.fileSize || wav.duration !== file.duration || hash(bytes) !== file.sha256) {
      throw new Error("STAGING_AUDIO_MISMATCH");
    }
    files.push({ ...file, sourceVersion: text.source_version, scriptSha256: hash(text.audio_script) });
  }
  const extensionBytes = await fs.readFile(path.resolve(__dirname, "../../data/demo/fifteen/extension.json"));
  if (hash(extensionBytes) !== extraLanguages.SOURCE) throw new Error("DEMO15_CONTENT_HASH_MISMATCH");
  files.push(...(await extraLanguages.verify(media, { manifest: JSON.parse(extensionBytes.toString("utf8")) })).files);
  files.push(...(await additional.verify(media)).files);
  if (files.length !== 270 || new Set(files.map(file => file.key)).size !== 270 ||
      new Set(files.map(file => file.poiId + ":" + file.languageCode)).size !== 270) {
    throw new Error("PACKAGED_AUDIO_COVERAGE_MISMATCH");
  }
  return { files, poiCount: 18, languageCount: 15, audioCount: 270 };
}

module.exports = { verify };
