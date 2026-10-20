const { createHash } = require("node:crypto");
const AppError = require("../utils/app-error");
const DemoSeedStore = require("../stores/demo-seed.store");
const ACTION = "SEED_APPROVED_DEMO", DATASET = "TCV_DEMO_POIS_V1";
const SAVED_LABEL = "Tọa độ tham khảo từ bản ghi nguồn đã lưu, chưa tái xác minh tại lần nhập, chưa khảo sát thực địa.";
const conflict = () => { throw new AppError(409, "DEMO_SEED_CONFLICT", "Dữ liệu demo không còn khớp; dừng để đối soát, không ghi đè."); };
function validate(input, database) {
  const invalid = () => { throw new AppError(400, "INVALID_DEMO_MANIFEST", "Cần bộ dữ liệu đã duyệt, đúng database và xác nhận nguồn vị trí phù hợp."); };
  const saved = input?.locationEvidence?.mode === "SAVED_SOURCE_ACCEPTED";
  const validLocation = saved ? input.locationEvidence.acceptedForBrowserDemo === true && input.osmCheckedAt === null && input.locationLabel === SAVED_LABEL :
    input?.locationEvidence === undefined && input?.locationLabel === "vị trí tham khảo từ OpenStreetMap, chưa khảo sát thực địa" && Number.isFinite(Date.parse(input?.osmCheckedAt));
  if (!/^tcv_(demo_review_20261020|seed_test_[a-f0-9]{32})$/.test(database || "") || input?.database !== database ||
      input.datasetId !== DATASET || input.approved !== true || input.audio !== "MOCK_TEST_TONE_NOT_SPEECH" ||
      !validLocation || !Array.isArray(input.pois) || input.pois.length !== 2 ||
      !input.tour || typeof input.tour.name !== "string" || !input.tour.name.startsWith("Lộ trình demo do nhóm đề xuất") ||
      typeof input.tour.description !== "string" || !input.tour.description.trim()) invalid();
  const pois = input.pois.map((poi, index) => {
    if (!poi || poi.key !== ["giraffe", "asian-elephant"][index] || !Number.isFinite(poi.latitude) || Math.abs(poi.latitude) > 90 ||
        !Number.isFinite(poi.longitude) || Math.abs(poi.longitude) > 180 ||
        poi.osmNode !== ["6045633938", "6045634869"][index]) invalid();
    let savedOsmSource;
    if (saved) {
      const record = poi.savedOsmSource;
      if (!record || record.nodeId !== poi.osmNode || record.url !== "https://www.openstreetmap.org/node/" + poi.osmNode ||
          record.latitude !== poi.latitude || record.longitude !== poi.longitude || !Number.isSafeInteger(record.version) || record.version < 1 ||
          !/^\d{4}-\d{2}-\d{2}$/.test(record.readOn || "") || !Number.isFinite(Date.parse(record.readOn)) ||
          typeof record.name !== "string" || !record.name.trim() || record.zoo !== "enclosure") invalid();
      savedOsmSource = Object.fromEntries(["nodeId", "url", "version", "readOn", "name", "zoo", "latitude", "longitude"].map(key => [key, record[key]]));
    }
    const text = Object.fromEntries(["vi", "en"].map(language => {
      const value = poi.text?.[language];
      if (!value || ["name", "description", "audioScript"].some(key => typeof value[key] !== "string" || !value[key].trim() || value[key].includes("[MOCK")) ||
          value.name.length > 255 || Buffer.byteLength(value.description) > 65535 || Buffer.byteLength(value.audioScript) > 65535) invalid();
      return [language, Object.fromEntries(["name", "description", "audioScript"].map(key => [key, value[key]]))];
    }));
    return { key: poi.key, latitude: poi.latitude, longitude: poi.longitude, osmNode: poi.osmNode, text, ...(saved ? { savedOsmSource } : {}) };
  });
  if (input.tour.name.length > 255 || Buffer.byteLength(input.tour.description) > 65535) invalid();
  // Fixed property order makes the digest independent of input JSON key order.
  return { datasetId: DATASET, database, approved: true, audio: input.audio, locationLabel: input.locationLabel,
    osmCheckedAt: saved ? null : new Date(input.osmCheckedAt).toISOString(),
    ...(saved ? { locationEvidence: { mode: "SAVED_SOURCE_ACCEPTED", acceptedForBrowserDemo: true } } : {}),
    pois, tour: { name: input.tour.name, description: input.tour.description } };
}
function expected(manifest) {
  return manifest.pois.map((poi, index) => ({ name: poi.text.vi.name, category: "ANIMAL", conservationStatus: null, activityHours: null,
    latitude: poi.latitude, longitude: poi.longitude, triggerRadius: 30, avatarUrl: null, displayOrder: index + 1,
    status: "ACTIVE", contentVersion: 1, text: poi.text }));
}
class DemoSeedService {
  constructor(store = new DemoSeedStore()) { this.store = store; }
  async seed(input, database) {
    const manifest = validate(input, database), digest = createHash("sha256").update(JSON.stringify(manifest)).digest("hex");
    try {
      return await this.store.transaction(database, DATASET, async ops => {
        const markers = await ops.markers(ACTION);
        if (markers.length > 1) conflict();
        if (markers.length) {
          let marker;
          try { marker = JSON.parse(markers[0].details); } catch { conflict(); }
          if (marker?.digest !== digest || !Array.isArray(marker.poiIds) || marker.poiIds.length !== 2 ||
              new Set(marker.poiIds).size !== 2 || ![...marker.poiIds, marker.tourId].every(id => Number.isSafeInteger(id) && id > 0)) conflict();
          const current = await ops.owned(marker);
          if (JSON.stringify(current.pois) !== JSON.stringify(expected(manifest)) ||
              JSON.stringify(current.tour) !== JSON.stringify(manifest.tour) ||
              JSON.stringify(current.links) !== JSON.stringify(marker.poiIds) ||
              JSON.stringify(current.translationIds) !== JSON.stringify(marker.translationIds) ||
              JSON.stringify(current.jobIds) !== JSON.stringify(marker.jobIds)) conflict();
          return { status: "UNCHANGED", datasetId: DATASET, ...marker };
        }
        if (await ops.collisions()) conflict();
        const languages = await ops.languages();
        if (JSON.stringify(languages) !== JSON.stringify(["en", "vi"])) {
          throw new AppError(409, "DEMO_LANGUAGES_UNAVAILABLE", "Cần vi/en đang hoạt động; seed không tự sửa danh mục ngôn ngữ.");
        }
        const ids = await ops.insert(manifest), marker = { digest, ...ids };
        await ops.audit(ACTION, marker);
        return { status: "CREATED", datasetId: DATASET, ...marker };
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(503, "DEMO_SEED_UNAVAILABLE", "Chưa xác định kết quả nhập demo; đối soát dấu nhập trước khi thử lại.");
    }
  }
}
module.exports = { DemoSeedService, validate, SAVED_LABEL };
