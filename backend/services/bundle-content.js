const { assetKey } = require("../adapters/local-media");
const { MAX_AUDIO_BYTES } = require("../utils/pcm-wav");
const prefix = "/api/media/audio/";
function languageOrder(requested, languages) {
  const active = new Set(languages.map(language => language.code));
  return [...new Set([requested, "en", "vi"])].filter(code => active.has(code));
}
function ready(row, version) {
  return row?.status === "READY" && row.sourceVersion === version &&
    [row.name, row.description, row.audioScript].every(value => typeof value === "string" && value.trim());
}
function audioReady(row, version) {
  return ready(row, version) && row.audioStatus === "AVAILABLE" && row.audioVersion === version &&
    typeof row.fileUrl === "string" && row.fileUrl.startsWith(prefix) && assetKey.test(row.fileUrl.slice(prefix.length)) &&
    Number.isSafeInteger(row.duration) && row.duration >= 0 && Number.isSafeInteger(Number(row.fileSize)) &&
    Number(row.fileSize) > 0 && Number(row.fileSize) <= MAX_AUDIO_BYTES;
}
function buildContent(snapshot, requested, languages) {
  const order = languageOrder(requested, languages), byPoi = new Map();
  for (const row of snapshot.translations) {
    if (!byPoi.has(row.poiId)) byPoi.set(row.poiId, new Map());
    byPoi.get(row.poiId).set(row.languageCode, row);
  }
  const pois = snapshot.pois.map(poi => {
    const latitude = Number(poi.latitude), longitude = Number(poi.longitude);
    if (!Number.isFinite(latitude) || Math.abs(latitude) > 90 || !Number.isFinite(longitude) || Math.abs(longitude) > 180) throw new Error("INVALID_BUNDLE_COORDINATES");
    const candidates = order.map(code => byPoi.get(poi.poiId)?.get(code));
    const text = candidates.find(row => ready(row, poi.contentVersion)), audio = candidates.find(row => audioReady(row, poi.contentVersion));
    return { poiId: poi.poiId, originalName: poi.originalName, category: poi.category, conservationStatus: poi.conservationStatus,
      activityHours: poi.activityHours, latitude, longitude, triggerRadius: poi.triggerRadius, avatarUrl: poi.avatarUrl, displayOrder: poi.displayOrder,
      text: text ? { status: "READY", languageCode: text.languageCode, isFallback: text.languageCode !== requested,
        name: text.name, description: text.description, audioScript: text.audioScript } :
        { status: "UNAVAILABLE", languageCode: null, isFallback: false, name: null, description: null, audioScript: null },
      audio: audio ? { status: "AVAILABLE", languageCode: audio.languageCode, isFallback: audio.languageCode !== requested,
        url: audio.fileUrl, mimeType: "audio/wav", duration: audio.duration } :
        { status: "UNAVAILABLE", languageCode: null, isFallback: false, url: null, mimeType: null, duration: null },
    };
  });
  const included = new Set(pois.map(poi => poi.poiId)), tourItems = new Map();
  for (const row of snapshot.items) if (included.has(row.poiId)) {
    if (!tourItems.has(row.tourId)) tourItems.set(row.tourId, []);
    tourItems.get(row.tourId).push({ poiId: row.poiId, sequenceNo: row.sequenceNo });
  }
  const tours = snapshot.tours.filter(tour => tourItems.has(tour.tourId)).map(tour => ({ tourId: tour.tourId, name: tour.name,
    description: tour.description, localization: "SHARED", items: tourItems.get(tour.tourId) }));
  return { pois, tours };
}
module.exports = { languageOrder, buildContent };
