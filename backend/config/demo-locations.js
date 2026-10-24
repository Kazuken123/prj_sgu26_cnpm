const bytes = require("node:fs").readFileSync(require("node:path").resolve(__dirname, "../../data/demo/locations/positions-v1.json"));
if (require("node:crypto").createHash("sha256").update(bytes).digest("hex") !== "0a162631e14c12c792e9bdcb9dc81be2030b9fa54640e5a87b4c93cd8bb0bfb4") throw new Error("APPROVED_POSITIONS_CHANGED");
const manifest = JSON.parse(bytes.toString("utf8"));
const same = (row, point) => row.poi_id === point.poiId && row.name === point.name &&
  Number(row.latitude) === point.latitude && Number(row.longitude) === point.longitude;
function locationNote(poi) {
  const point = manifest.points.find(p => same({ poi_id: poi.poiId, name: poi.originalName, latitude: poi.latitude, longitude: poi.longitude }, p));
  return point ? { kind: point.kind, label: point.kind === "OSM_REFERENCE"
    ? "Vị trí tham khảo OSM theo bản ghi nguồn đã lưu; chưa tái xác minh, chưa khảo sát thực địa."
    : "Vị trí mô phỏng theo sơ đồ cho demo; không xác nhận vị trí thực tế của cá thể hoặc cây." } : null;
}
function normalizeApprovedPositions(rows, baseline) {
  // Accept either the exact old dataset or the exact approved overlay, never arbitrary drift.
  if (rows.length !== manifest.points.length || !rows.every(row => manifest.points.some(point => same(row, point)))) return rows;
  return rows.map(row => {
    const original = baseline.find(p => p.poi_id === row.poi_id);
    return original ? { ...row, latitude: original.latitude, longitude: original.longitude } : row;
  });
}
module.exports = { manifest, locationNote, normalizeApprovedPositions };
