const TranslationStore = require("../stores/translation.store");
const AppError = require("../utils/app-error");
const validation = require("./translation.validation");
const { assertContentEditor } = require("./internal-access");
const fields = ["name", "description", "audioScript"];
const valid = text => text && fields.every(key => typeof text[key] === "string" && text[key].trim());
const current = (text, version) => valid(text) && text.status === "READY" && text.sourceVersion === version;
const textView = text => text ? Object.fromEntries(["sourceVersion", "status", ...fields].map(key => [key, text[key]])) : null;

class TranslationService {
  constructor(store = new TranslationStore()) { this.store = store; }
  async operate(actor, rawId, rawLanguage, input, { ipAddress = null } = {}) {
    assertContentEditor(actor);
    const poiId = validation.id(rawId), languageCode = validation.language(rawLanguage);
    const data = input === undefined ? undefined : validation.input(input);
    const policies = new Set();
    const policy = error => { policies.add(error); throw error; };
    try {
      return await this.store.withTranslation(actor.userId ?? actor.user_id, poiId, languageCode, async state => {
        try { assertContentEditor(state.actor); } catch (error) { policy(error); }
        if (!state.parent) policy(new AppError(404, "POI_NOT_FOUND", "Không tìm thấy POI."));
        if (!state.language || !state.language.active) policy(new AppError(409, "TRANSLATION_LANGUAGE_DISABLED", "Ngôn ngữ chưa được bật; không tự thay cấu hình."));
        const version = state.parent.contentVersion;
        const result = outcome => ({ poiId, languageCode, sourceVersion: version,
          source: textView(state.source), translation: textView(state.translation),
          job: state.job ? { jobId: state.job.jobId, status: state.job.status, canRetry: state.job.status === "FAILED" } : null,
          ...(outcome ? { outcome } : {}) });
        if (!data) return result();
        if (version !== data.sourceVersion) policy(new AppError(409, "TRANSLATION_SOURCE_CONFLICT", "Nguồn VI đã thay đổi; tải lại và rà bản dịch trước khi nhập."));
        if (!current(state.source, version)) policy(new AppError(409, "TRANSLATION_SOURCE_UNAVAILABLE", "Nguồn VI đúng phiên bản chưa sẵn sàng."));
        if (state.job?.status === "PROCESSING") policy(new AppError(409, "TRANSLATION_JOB_PROCESSING", "Tác vụ đang xử lý; kiểm tra lại sau, không thay nội dung giữa lượt chạy."));
        if (state.translation?.status === "READY" && state.translation.sourceVersion === version) {
          if (fields.every(key => state.translation[key] === data[key])) return result("UNCHANGED");
          policy(new AppError(409, "TRANSLATION_READY_CONFLICT", "Bản dịch READY hiện hành được giữ nguyên; mốc này không ghi đè bản đã xuất bản."));
        }
        if (state.translation?.sourceVersion === version) {
          policy(new AppError(409, "TRANSLATION_EXISTING_CONFLICT", "Đã có bản dịch của phiên bản này cần đối soát; mốc này chỉ nhập bản thiếu hoặc thay bản lỗi thời."));
        }
        if (state.translation?.sourceVersion > version) policy(new AppError(409, "TRANSLATION_VERSION_INCONSISTENT", "Phiên bản bản dịch cần đối soát; không tự ghi đè."));
        if (!state.job || !["PENDING", "FAILED"].includes(state.job.status)) {
          policy(new AppError(409, "TRANSLATION_JOB_UNAVAILABLE", "Chưa có tác vụ phù hợp để nhận bản dịch; cần đối soát trạng thái."));
        }
        if (state.audio?.status === "AVAILABLE" && state.audio.sourceVersion === version) {
          policy(new AppError(409, "TRANSLATION_AUDIO_CONFLICT", "Đã có audio hiện hành cần đối soát; không thay văn bản dưới file đã xuất bản."));
        }
        await state.persist(data, ipAddress);
        state.translation = { ...data, status: "READY" };
        return result("IMPORTED");
      });
    } catch (error) {
      if (policies.has(error)) throw error;
      throw new AppError(503, "TRANSLATION_STORAGE_UNAVAILABLE", "Chưa xác nhận thao tác bản dịch; tải lại để đối soát trước khi gửi lại.");
    }
  }
  async get(actor, id, language) { return this.operate(actor, id, language); }
  async importReviewed(actor, id, language, input, options) {
    // Undefined is reserved for GET internally, never an empty PUT.
    assertContentEditor(actor);
    return this.operate(actor, id, language, validation.input(input), options);
  }
}
module.exports = new TranslationService();
module.exports.TranslationService = TranslationService;
