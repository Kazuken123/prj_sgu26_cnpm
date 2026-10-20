const AppError = require("../utils/app-error");
const ContentStore = require("../stores/content.store");
const LocalMediaStorage = require("../adapters/local-media");
const { assetKey } = require("../adapters/local-media");
const { inspectWav } = require("../utils/pcm-wav");
const { limited } = require("./pipeline-audio");
class MediaService {
  constructor(store = new ContentStore(), storage = new LocalMediaStorage()) { this.store = store; this.storage = storage; }
  async getAudio(key, visit) {
    if (!visit || visit.status !== "ACTIVE") throw new AppError(401, "VISITOR_SESSION_REQUIRED", "Cần phiên khách hợp lệ.");
    if (typeof key !== "string" || !assetKey.test(key)) throw new AppError(400, "INVALID_MEDIA_KEY", "Mã tệp không hợp lệ.");
    let row;
    try { row = await this.store.getPublishedAudio("/api/media/audio/" + key); }
    catch { throw new AppError(503, "AUDIO_UNAVAILABLE", "Chưa kiểm tra được dữ liệu âm thanh."); }
    if (!row) throw new AppError(404, "AUDIO_NOT_FOUND", "Chưa có âm thanh phù hợp.");
    try {
      const bytes = await limited(() => this.storage.get(key), 10000, "MEDIA_READ_TIMEOUT");
      const info = inspectWav(bytes);
      if (info.fileSize !== row.fileSize || info.duration !== row.duration) throw new Error("AUDIO_METADATA_CHANGED");
      return bytes;
    } catch { throw new AppError(503, "AUDIO_UNAVAILABLE", "Tệp âm thanh tạm thời không tải được."); }
  }
}
module.exports = { MediaService };
