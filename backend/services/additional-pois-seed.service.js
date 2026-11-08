const { LANGUAGE_CODES, loadInput } = require("../config/additional-pois-input");
const AdditionalPoisSeedStore = require("../stores/additional-pois-seed.store");
const LocalMedia = require("../adapters/local-media");
const assets = require("../config/additional-assets");

function equal(actual, expected, code) { if (actual !== expected) throw new Error(code); }
function unique(rows, key, code) {
  const result = new Map();
  for (const row of rows) { const value = key(row); if (result.has(value)) throw new Error(code); result.set(value, row); }
  return result;
}

function validateSnapshot(state, input, manifest, complete = false) {
  const languages = unique(state.languages, l => l.code, "ADDITIONAL_LANGUAGE_CONFLICT");
  if (LANGUAGE_CODES.some(code => Number(languages.get(code)?.is_active) !== 1)) throw new Error("ADDITIONAL_ACTIVE_LANGUAGES_REQUIRED");
  const pois = unique(state.pois, p => Number(p.poi_id), "ADDITIONAL_POI_ID_CONFLICT");
  unique(state.pois, p => p.name, "ADDITIONAL_POI_NAME_CONFLICT");
  const translations = unique(state.translations, t => Number(t.poi_id) + ":" + t.language_code, "ADDITIONAL_TRANSLATION_CONFLICT");
  const audios = unique(state.audios, a => Number(a.translation_id), "ADDITIONAL_AUDIO_CONFLICT");
  const jobs = unique(state.jobs, j => Number(j.poi_id) + ":" + j.language_code, "ADDITIONAL_JOB_CONFLICT");
  const files = new Map(manifest.files.map(file => [file.poiId + ":" + file.languageCode, file]));
  const counts = { pois: 0, translations: 0, audios: 0, jobs: 0 };
  for (const p of input.pois) {
    const row = pois.get(p.poiId);
    if (state.pois.some(item => item.name === p.name && Number(item.poi_id) !== p.poiId)) throw new Error("ADDITIONAL_POI_IDENTITY_CONFLICT");
    if (row) {
      for (const [field, expected] of Object.entries({ name: p.name, category: p.category, conservation_status: p.conservationStatus, activity_hours: p.activityHours,
        latitude: p.latitude, longitude: p.longitude, trigger_radius: p.radius, display_order: p.displayOrder, status: "ACTIVE", content_version: p.sourceVersion, avatar_url: null })) {
        equal(typeof expected === "number" ? Number(row[field]) : row[field], expected, "ADDITIONAL_POI_DATA_CONFLICT");
      }
      counts.pois++;
    }
    for (const code of LANGUAGE_CODES) {
      const key = p.poiId + ":" + code, t = translations.get(key), j = jobs.get(key), file = files.get(key);
      if (t) {
        if (!row) throw new Error("ADDITIONAL_TRANSLATION_PARENT_CONFLICT");
        for (const [field, expected] of Object.entries({ name: p.translations[code].name, description: p.translations[code].description,
          audio_script: p.translations[code].audioScript, source_version: p.sourceVersion, status: "READY" })) {
          equal(typeof expected === "number" ? Number(t[field]) : t[field], expected, "ADDITIONAL_TRANSLATION_DATA_CONFLICT");
        }
        counts.translations++;
        const a = audios.get(Number(t.translation_id));
        if (a) {
          for (const [field, expected] of Object.entries({ file_url: "/api/media/audio/" + file.key, duration: file.duration, file_size: file.fileSize, source_version: file.sourceVersion, status: "AVAILABLE" })) {
            equal(typeof expected === "number" ? Number(a[field]) : a[field], expected, "ADDITIONAL_AUDIO_DATA_CONFLICT");
          }
          counts.audios++;
        }
      }
      if (j) {
        if (!row || !t || !audios.has(Number(t.translation_id))) throw new Error("ADDITIONAL_JOB_PARENT_CONFLICT");
        equal(Number(j.source_version), p.sourceVersion, "ADDITIONAL_JOB_DATA_CONFLICT");
        equal(j.status, "COMPLETED", "ADDITIONAL_JOB_DATA_CONFLICT");
        for (const field of ["error_message", "claim_id", "lease_expires_at"]) equal(j[field], null, "ADDITIONAL_JOB_DATA_CONFLICT");
        counts.jobs++;
      }
    }
  }
  if (state.pois.length !== counts.pois || state.translations.length !== counts.translations || state.audios.length !== counts.audios || state.jobs.length !== counts.jobs) throw new Error("ADDITIONAL_UNEXPECTED_RECORDS");
  if (complete && (counts.pois !== 8 || counts.translations !== 120 || counts.audios !== 120 || counts.jobs !== 120)) throw new Error("ADDITIONAL_DATABASE_VERIFICATION_FAILED");
  return counts;
}

class AdditionalPoisSeedService {
  constructor(store = new AdditionalPoisSeedStore(), media = new LocalMedia(), dependencies = {}) {
    this.store = store; this.media = media; this.loadInput = dependencies.loadInput || loadInput; this.verify = dependencies.verify || assets.verify;
  }
  async run({ apply = false } = {}) {
    const input = await this.loadInput();
    const manifest = await this.verify(this.media, input);
    return this.store.run(apply, async state => {
      const existing = validateSnapshot(await state.snapshot(input), input, manifest);
      const pending = { pois: 8 - existing.pois, translations: 120 - existing.translations, audios: 120 - existing.audios, jobs: 120 - existing.jobs };
      if (!apply) return { outcome: "PLAN", datasetId: input.datasetId, sourceSha256: input.sourceSha256, verifiedPois: 8, verifiedTranslations: 120, verifiedAudios: 120, existing, pending };
      const inserted = { pois: 0, translations: 0, audios: 0, jobs: 0 };
      for (const p of input.pois) inserted.pois += await state.insertPoi(p);
      for (const p of input.pois) for (const code of LANGUAGE_CODES) inserted.translations += await state.insertTranslation(p, code);
      for (const file of manifest.files) inserted.audios += await state.insertAudio(file);
      for (const p of input.pois) for (const code of LANGUAGE_CODES) inserted.jobs += await state.insertJob(p, code);
      const verified = validateSnapshot(await state.snapshot(input), input, manifest, true);
      return { outcome: Object.values(inserted).some(count => count > 0) ? "CREATED" : "UNCHANGED", datasetId: input.datasetId, sourceSha256: input.sourceSha256, inserted, verified };
    });
  }
}

module.exports = { AdditionalPoisSeedService, validateSnapshot };
