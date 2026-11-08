const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { ADDITIONAL_POI_NAMES } = require("./additional-pois-input");

const DIGEST = "900052f7865dd27f0e69c38f2f17a7bb89ac0f185cfdfd4860e9f66c1914adea";
const VERSION = "TCV_BROWSER_DEMO_POSITIONS_V2";
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const v1Bytes = fs.readFileSync(path.resolve(__dirname, "../../data/demo/locations/positions-v1.json"));
if (hash(v1Bytes) !== "0a162631e14c12c792e9bdcb9dc81be2030b9fa54640e5a87b4c93cd8bb0bfb4") throw new Error("APPROVED_POSITIONS_CHANGED");
const v1 = JSON.parse(v1Bytes.toString("utf8"));
const names = [...v1.points.map(point => point.name), ...ADDITIONAL_POI_NAMES];

function parse(bytes) {
  if (hash(bytes) !== DIGEST) throw new Error("POI_LOCATIONS_MANIFEST_CHANGED");
  const data = JSON.parse(bytes.toString("utf8"));
  if (data.version !== VERSION || !Array.isArray(data.points) || data.points.length !== 18 ||
      data.points.some((point, index) => point.poiId !== index + 1 || point.name !== names[index] ||
        !Number.isFinite(point.latitude) || Math.abs(point.latitude) > 90 || !Number.isFinite(point.longitude) || Math.abs(point.longitude) > 180 ||
        point.surveyed !== false || !["OSM_REFERENCE", "SCHEMATIC_SIMULATION", "MAP_REFERENCE_SECONDARY", "SEED_APPROXIMATION"].includes(point.kind)) ||
      JSON.stringify(data.points.slice(0, 10)) !== JSON.stringify(v1.points)) throw new Error("POI_LOCATIONS_MANIFEST_INVALID");
  return data;
}

const manifest = parse(fs.readFileSync(path.resolve(__dirname, "../../data/demo/locations/positions-v2.json")));
const reviewed = point => point.kind !== "SEED_APPROXIMATION";
const canUpdate = point => Boolean(point && Number.isInteger(point.poiId) && point.poiId >= 11 && point.poiId <= 18 && reviewed(point));
const sameCoordinates = (row, point) => Number(row.latitude) === point.latitude && Number(row.longitude) === point.longitude;

function locationNote(poi) {
  if (Number(poi.poiId) <= 10) return null;
  const point = manifest.points.find(item => item.poiId === Number(poi.poiId) && item.name === poi.originalName);
  if (!point) return null;
  if (!reviewed(point)) return { kind: "SEED_APPROXIMATION", label: point.poiId === 18
    ? "Chưa xác định cá thể cây hoặc xác nhận danh hiệu cây di sản; tọa độ hiện có được giữ để chờ đối chiếu."
    : "Chưa có hồ sơ xác minh vị trí cho điểm này; tọa độ hiện có được giữ để chờ đối chiếu." };
  if (!sameCoordinates(poi, point)) return { kind: "SEED_APPROXIMATION", label: "Tọa độ hiện tại chưa khớp hồ sơ vị trí tham khảo; cần đối chiếu trước khi cập nhật." };
  const labels = {
    OSM_REFERENCE: "Vị trí tham khảo OSM theo bản ghi nguồn đã lưu; chưa tái xác minh, chưa khảo sát thực địa.",
    SCHEMATIC_SIMULATION: "Vị trí mô phỏng theo sơ đồ cho demo; không xác nhận vị trí thực tế của cá thể hoặc cây.",
    MAP_REFERENCE_SECONDARY: "Vị trí tham khảo OSM được Mapcarta dẫn lại; chưa tái xác minh nguồn OSM hoặc khảo sát lối vào.",
  };
  return { kind: point.kind, label: labels[point.kind] };
}

// Publication source hashes retain the original seed coordinates. Only the seven
// exact reviewed V2 pairs are normalized during idempotent seed comparisons.
function normalizeAdditionalPosition(row, source) {
  const point = manifest.points.find(item => item.poiId === source.poiId && item.name === source.name && item.poiId >= 11 && item.poiId <= 17 &&
    ["MAP_REFERENCE_SECONDARY", "SCHEMATIC_SIMULATION"].includes(item.kind));
  if (!point || Number(row.poi_id) !== source.poiId || row.name !== source.name ||
      Number(row.content_version) !== source.sourceVersion || !sameCoordinates(row, point)) return row;
  return { ...row, latitude: source.latitude, longitude: source.longitude };
}

module.exports = { DIGEST, VERSION, manifest, parse, reviewed, canUpdate, sameCoordinates, locationNote, normalizeAdditionalPosition };
