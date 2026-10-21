const { createHash } = require("node:crypto");
function revision(tour) {
  const items = tour.items.map(item => [item.poiId, item.sequenceNo]).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  // Content fingerprint, not a monotonic version or an authorization token.
  // POI labels/status and timestamps are outside the editable tour content.
  return createHash("sha256").update(JSON.stringify(["tour-content-v1", tour.tourId, tour.name, tour.description ?? null, items])).digest("hex");
}
function withRevision(tour) { return { ...tour, revision: revision(tour) }; }
module.exports = { revision, withRevision };
