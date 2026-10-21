const { createHash, randomUUID } = require("node:crypto");
const AppError = require("../utils/app-error");
const DemoAudioStore = require("../stores/demo-audio.store");
const LocalMedia = require("../adapters/local-media");
const { assetKey } = require("../adapters/local-media");
const { inspectWav } = require("../utils/pcm-wav");
const { limited } = require("./pipeline-audio");
const { validate } = require("./demo-seed.service");
const approved = require("../../data/demo/draft03.json");
const approvedFiles = require("../../data/demo/piper-reviewed/manifest.json");
const DATASET = "TCV_DEMO_POIS_V1", PUBLISH = "PUBLISH_DEMO_AUDIO", ROLLBACK = "ROLLBACK_DEMO_AUDIO";
const hash = value => createHash("sha256").update(value).digest("hex");
const digest = value => hash(JSON.stringify(value));
const conflict = () => { throw new AppError(409, "DEMO_AUDIO_CONFLICT", "Dữ liệu hoặc file không còn khớp; dừng đối soát, không ghi đè."); };
const fields = asset => Object.fromEntries(["translationId", "fileUrl", "duration", "fileSize", "sourceVersion", "status"].map(key => [key, asset[key]]));
const sameAssets = (a, b) => digest(a.map(fields)) === digest(b.map(fields));
function target(database) {
  if (!/^tcv_(demo_review_20261020|seed_test_[a-f0-9]{32})$/.test(database || "")) throw new AppError(400, "INVALID_DEMO_AUDIO_TARGET", "Cần đúng database demo đã duyệt.");
}
function expectedPois(manifest) {
  return manifest.pois.map((poi, index) => ({ name: poi.text.vi.name, category: "ANIMAL", conservationStatus: null, activityHours: null,
    latitude: poi.latitude, longitude: poi.longitude, triggerRadius: 30, avatarUrl: null, displayOrder: index + 1, status: "ACTIVE", contentVersion: 1, text: poi.text }));
}
function sourceDigest(state) {
  return digest(Object.fromEntries(["pois", "tour", "links", "translationIds", "jobIds", "jobStates"].map(key => [key, state[key]])));
}
class DemoAudioService {
  constructor(store = new DemoAudioStore(), media = new LocalMedia(), candidates, files = approvedFiles) { this.store = store; this.media = media; this.candidates = candidates; this.approvedFiles = files; }
  async state(ops, database) {
    const manifest = validate({ ...approved, database }, database), markers = await ops.markers("SEED_APPROVED_DEMO");
    if (markers.length !== 1) conflict();
    let marker;
    try { marker = JSON.parse(markers[0].details); } catch { conflict(); }
    if (marker.digest !== digest(manifest) || !Array.isArray(marker.poiIds) || marker.poiIds.length !== 2 || new Set(marker.poiIds).size !== 2 ||
        ![...marker.poiIds, marker.tourId].every(id => Number.isSafeInteger(id) && id > 0)) conflict();
    const state = await ops.owned(marker);
    if (!state.pois || digest(state.pois) !== digest(expectedPois(manifest)) || digest(state.tour) !== digest(manifest.tour) ||
        digest(state.links) !== digest(marker.poiIds) || digest(state.translationIds) !== digest(marker.translationIds) || digest(state.jobIds) !== digest(marker.jobIds) ||
        state.translationIds.length !== 4 || state.audios.length !== 4 || state.jobStates.some(job => !job || job.status !== "COMPLETED" || job.sourceVersion !== 1 || job.claimId !== null || job.leaseExpiresAt !== null)) conflict();
    return state;
  }
  async bytes(storage, key, expectedHash) {
    const bytes = await limited(() => storage.get(key), 10000, "DEMO_AUDIO_FILE_TIMEOUT");
    const info = inspectWav(bytes);
    if (expectedHash && hash(bytes) !== expectedHash) conflict();
    return { bytes, info, sha256: hash(bytes) };
  }
  async plan(database, spec) {
    target(database);
    if (!spec || digest(spec) !== digest(this.approvedFiles) || spec.approved !== true || spec.approvalId !== "USER_PIPER_DEMO_20261022" || !Array.isArray(spec.files) || spec.files.length !== 4 ||
        new Set(spec.files.map(file => file?.key)).size !== 4 || spec.files.some((file, i) => !file || !assetKey.test(file.key || "") || !/^[a-f0-9]{64}$/.test(file.sha256 || "") ||
          file.poiKey !== ["giraffe", "giraffe", "asian-elephant", "asian-elephant"][i] || file.languageCode !== ["vi", "en", "vi", "en"][i])) {
      throw new AppError(400, "INVALID_DEMO_AUDIO_MANIFEST", "Cần đúng bốn file giọng đọc đã duyệt và nhãn VI/EN.");
    }
    try {
      return await this.store.transaction(database, DATASET, async ops => {
        const state = await this.state(ops, database), oldAssets = [], newAssets = [];
        for (const [i, old] of state.audios.entries()) {
          const key = typeof old.fileUrl === "string" ? old.fileUrl.replace("/api/media/audio/", "") : "";
          if (!assetKey.test(key) || old.status !== "AVAILABLE" || old.sourceVersion !== 1 || old.duration !== 1 || old.fileSize !== 32044) conflict();
          const previous = await this.bytes(this.media, key, "2720c50ccc3bceb00d37a9dd9cc8134701601a0cd412ff5091d205e6c98cd26c");
          const file = spec.files[i], next = await this.bytes(this.candidates, file.key, file.sha256);
          if (next.info.duration <= 1 || key === file.key) conflict();
          oldAssets.push({ ...fields(old), sha256: previous.sha256 });
          newAssets.push({ translationId: old.translationId, fileUrl: "/api/media/audio/" + file.key, duration: next.info.duration,
            fileSize: next.info.fileSize, sourceVersion: 1, status: "AVAILABLE", sha256: next.sha256 });
        }
        const plan = { database, operationId: randomUUID(), approvalId: spec.approvalId, sourceDigest: sourceDigest(state), oldAssets, newAssets };
        return { ...plan, digest: digest(plan) };
      });
    } catch (error) { this.fail(error); }
  }
  validatePlan(plan, database) {
    target(database);
    if (!plan || plan.database !== database || plan.approvalId !== "USER_PIPER_DEMO_20261022" ||
        !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(plan.operationId || "") ||
        !/^[a-f0-9]{64}$/.test(plan.sourceDigest || "") || ![plan.oldAssets, plan.newAssets].every(list => Array.isArray(list) && list.length === 4 &&
          new Set(list.map(asset => asset.translationId)).size === 4 && list.every(asset => Number.isSafeInteger(asset.translationId) && asset.translationId > 0 &&
            /^\/api\/media\/audio\/[a-f0-9-]+\.wav$/.test(asset.fileUrl || "") && assetKey.test(asset.fileUrl.slice(17)) && asset.sourceVersion === 1 && asset.status === "AVAILABLE" &&
            Number.isSafeInteger(asset.duration) && asset.duration > 0 && Number.isSafeInteger(asset.fileSize) && asset.fileSize > 44 && /^[a-f0-9]{64}$/.test(asset.sha256 || "")))) {
      throw new AppError(400, "INVALID_DEMO_AUDIO_PLAN", "Kế hoạch chuyển audio không hợp lệ.");
    }
    const { digest: expected, ...body } = plan;
    if (digest(body) !== expected || plan.oldAssets.some((old, i) => old.translationId !== plan.newAssets[i].translationId || old.duration !== 1 || old.fileSize !== 32044 ||
        old.sha256 !== "2720c50ccc3bceb00d37a9dd9cc8134701601a0cd412ff5091d205e6c98cd26c" ||
        plan.newAssets[i].fileUrl !== "/api/media/audio/" + this.approvedFiles.files[i].key || plan.newAssets[i].sha256 !== this.approvedFiles.files[i].sha256) ||
        new Set(plan.newAssets.map(asset => asset.fileUrl)).size !== 4) conflict();
  }
  async apply(database, plan, rollback = false) {
    this.validatePlan(plan, database);
    try {
      // Keep old files, including on uncertain SQL outcome. Never delete candidates here.
      for (const old of plan.oldAssets) {
        const previous = await this.bytes(this.media, old.fileUrl.slice(17), old.sha256);
        if (previous.info.duration !== old.duration || previous.info.fileSize !== old.fileSize) conflict();
      }
      if (!rollback) for (const asset of plan.newAssets) {
        const key = asset.fileUrl.slice(17), file = await this.bytes(this.candidates, key, asset.sha256);
        if (file.info.duration !== asset.duration || file.info.fileSize !== asset.fileSize) conflict();
        try { await this.bytes(this.media, key, asset.sha256); }
        catch (error) { if (error.code !== "ENOENT") throw error; await limited(signal => this.media.put(key, file.bytes, { signal }), 10000, "DEMO_AUDIO_WRITE_TIMEOUT"); }
      }
      return await this.store.transaction(database, DATASET, async ops => {
        const state = await this.state(ops, database);
        if (sourceDigest(state) !== plan.sourceDigest) conflict();
        const published = await ops.markers(PUBLISH), reverted = await ops.markers(ROLLBACK);
        const find = records => records.map(row => { try { return JSON.parse(row.details); } catch { conflict(); } }).filter(row => row.operationId === plan.operationId);
        const p = find(published), r = find(reverted), goal = rollback ? plan.oldAssets : plan.newAssets, previous = rollback ? plan.newAssets : plan.oldAssets;
        if (p.length > 1 || r.length > 1 || [...p, ...r].some(row => row.digest !== plan.digest)) conflict();
        if (rollback ? p.length !== 1 : r.length !== 0) conflict();
        if ((rollback ? r : p).length) { if (!sameAssets(state.audios, goal)) conflict(); return { status: "UNCHANGED", operationId: plan.operationId, rollback }; }
        if (!sameAssets(state.audios, previous)) conflict();
        await state.replace(goal);
        await ops.audit(rollback ? ROLLBACK : PUBLISH, { ...plan, provider: "PIPER", audioCount: 4, rollback });
        return { status: rollback ? "ROLLED_BACK" : "PUBLISHED", operationId: plan.operationId, audioCount: 4 };
      });
    } catch (error) { this.fail(error); }
  }
  fail(error) {
    if (error instanceof AppError) throw error;
    throw new AppError(503, "DEMO_AUDIO_UNAVAILABLE", "Chưa xác định kết quả chuyển audio; đối soát operationId và nhật ký trước khi thử lại. Giữ nguyên mọi file.");
  }
}
module.exports = { DemoAudioService };
