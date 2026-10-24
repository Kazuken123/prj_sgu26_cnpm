const { createHash } = require("node:crypto");
const StagingStore = require("../stores/staging.store"), LocalMedia = require("../adapters/local-media");
const { load, columns, DIGEST } = require("../config/staging-dataset"), { inspectWav } = require("../utils/pcm-wav");
function canonical(rows, cols) {
  return JSON.stringify(rows.map(row => cols.map(c => row[c])).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))));
}
function matches(actual, expected) { return Object.entries(columns).every(([t, cols]) => canonical(actual[t], cols) === canonical(expected[t], cols)); }
class StagingService {
  constructor(store = new StagingStore(), media = new LocalMedia()) { this.store = store; this.media = media; }
  async verifyMedia() {
    const data = await load();
    for (const file of data.files) {
      const bytes = await this.media.get(file.key), wav = inspectWav(bytes);
      if (bytes.length !== file.fileSize || Math.ceil(wav.duration) !== file.duration || createHash("sha256").update(bytes).digest("hex") !== file.sha256) throw new Error("STAGING_AUDIO_MISMATCH");
    }
    return data;
  }
  async prepareRuntime() {
    await this.verifyMedia();
    const extra = process.env.STAGING_DEMO_EXTRA_LANGUAGES === "true"
      ? (await require("../config/demo15-assets").verify(this.media)).files.length : 0;
    return this.store.locked(async () => ({ outcome: "RUNTIME_READY", packagedAudio: 70 + extra }));
  }
  async ensure() {
    const data = await this.verifyMedia();
    return this.store.locked(async state => {
      const before = await state.snapshot();
      if (matches(before, data.tables)) return { outcome: "UNCHANGED", pois: 10, languages: 7, audio: 70 };
      const baseline = Object.fromEntries(Object.keys(columns).map(t => [t, t === "LANGUAGES" ? data.tables.LANGUAGES.filter(l => ["vi", "en"].includes(l.code)) : []]));
      if (!matches(before, baseline)) throw new Error("STAGING_DATA_CONFLICT_STOP");
      for (const [table, rows] of Object.entries(data.tables)) await state.insert(table, table === "LANGUAGES" ? rows.filter(l => !["vi", "en"].includes(l.code)) : rows);
      if (!matches(await state.snapshot(), data.tables)) throw new Error("STAGING_DATA_VERIFICATION_FAILED");
      await state.audit({ datasetId: data.datasetId, manifestSha256: DIGEST, mode: data.mode, poiCount: 10, languageCount: 7, audioCount: 70 });
      return { outcome: "CREATED", pois: 10, languages: 7, audio: 70 };
    }, { initializeEmpty: process.env.STAGING_INITIALIZE_EMPTY === "true" });
  }
}
module.exports = { StagingService, matches };
