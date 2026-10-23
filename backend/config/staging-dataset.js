const fs = require("node:fs/promises"), path = require("node:path"), { createHash } = require("node:crypto");
const DIGEST = "40433f6f3d1254788d39901b7f71a190b68e0e973d8ca7b81e50fda87dc54280";
const columns = {
  LANGUAGES: ["code", "name", "is_active"],
  POIS: ["poi_id", "name", "category", "conservation_status", "activity_hours", "latitude", "longitude", "trigger_radius", "avatar_url", "display_order", "status", "content_version"],
  POI_TRANSLATIONS: ["translation_id", "poi_id", "language_code", "name", "description", "audio_script", "source_version", "status"],
  AUDIOS: ["audio_id", "translation_id", "file_url", "duration", "file_size", "source_version", "status"],
  CONTENT_JOBS: ["job_id", "poi_id", "language_code", "source_version", "status", "error_message", "claim_id", "lease_expires_at"],
  TOURS: ["tour_id", "name", "description"], TOUR_POIS: ["tour_id", "poi_id", "sequence_no"],
};
function parse(bytes) {
  if (createHash("sha256").update(bytes).digest("hex") !== DIGEST) throw new Error("STAGING_DATASET_HASH_MISMATCH");
  const data = JSON.parse(bytes.toString("utf8"));
  const counts = [7, 10, 70, 70, 70, 1, 2];
  if (data.datasetId !== "TCV_STAGING_FROZEN_20261023" || data.files.length !== 70 ||
      Object.keys(data.tables).length !== 7 || Object.entries(columns).some(([table, cols], i) =>
        data.tables[table]?.length !== counts[i] || data.tables[table].some(row =>
          Object.keys(row).length !== cols.length || cols.some(c => !Object.hasOwn(row, c))))) throw new Error("STAGING_DATASET_INVALID");
  return data;
}
async function load() { return parse(await fs.readFile(path.resolve(__dirname, "../../data/staging/dataset.json"))); }
module.exports = { columns, DIGEST, parse, load };
