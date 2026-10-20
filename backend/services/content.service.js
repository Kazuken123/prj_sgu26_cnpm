const { createHash } = require("node:crypto");
const AppError = require("../utils/app-error");
const ContentStore = require("../stores/content.store");
const { languageOrder, buildContent } = require("./bundle-content");
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
function queryLanguage(query) {
  if (!query || typeof query !== "object" || Array.isArray(query) || Object.keys(query).length !== 1 || Object.keys(query)[0] !== "languageCode" ||
      typeof query.languageCode !== "string" || !/^[a-zA-Z][a-zA-Z0-9-]{0,9}$/.test(query.languageCode)) {
    throw new AppError(400, "VALIDATION_ERROR", "Chỉ nhận một languageCode hợp lệ.");
  }
  return query.languageCode;
}
function authorize(row, tokenHash, nowUtc) {
  if (!row || row.tokenHash !== tokenHash) throw new AppError(401, "INVALID_VISITOR_TOKEN", "Token khách không hợp lệ.");
  const valid = value => value instanceof Date && Number.isFinite(value.getTime());
  if (!valid(nowUtc)) throw new Error("INVALID_SQL_CLOCK");
  if (row.paymentStatus !== "PAID" || row.sessionStatus !== "ACTIVE" || !valid(row.paidAt) || !valid(row.activatedAt) || !valid(row.expiresAt)) {
    throw new AppError(401, "INVALID_VISITOR_SESSION", "Phiên tham quan không còn hợp lệ.");
  }
  if (row.expiresAt <= nowUtc) throw new AppError(401, "VISIT_SESSION_EXPIRED", "Vé đã hết hạn.");
}
class ContentService {
  constructor(store = new ContentStore()) { this.store = store; }
  async getBundle(visit, query, token) {
    if (!visit || visit.status !== "ACTIVE" || !uuid.test(visit.sessionId || "") ||
        typeof token !== "string" || !/^tcv_visit_[a-f0-9]{64}$/.test(token)) throw new AppError(401, "INVALID_VISITOR_TOKEN", "Cần token khách hợp lệ.");
    const requested = queryLanguage(query), tokenHash = createHash("sha256").update(token).digest("hex");
    // Pass only our own policy errors through; never trust a Store/driver's status/code.
    const policyErrors = new Set();
    const policy = error => { policyErrors.add(error); throw error; };
    try {
      return await this.store.withBundleSnapshot({ sessionId: visit.sessionId, tokenHash }, async ops => {
        try { authorize(ops.visit, tokenHash, ops.nowUtc); }
        catch (error) { if (error instanceof AppError) policy(error); throw error; }
        const languages = await ops.languages();
        const language = languages.find(item => item.code.toLowerCase() === requested.toLowerCase());
        if (!language) policy(new AppError(400, "LANGUAGE_NOT_SUPPORTED", "Ngôn ngữ không được hỗ trợ hoặc đã ngừng hoạt động."));
        const snapshot = await ops.content(languageOrder(language.code, languages));
        const data = { requestedLanguageCode: language.code, generatedAt: ops.nowUtc.toISOString(), expiresAt: ops.visit.expiresAt.toISOString(),
          languages: languages.map(item => ({ code: item.code, name: item.name })), ...buildContent(snapshot, language.code, languages) };
        JSON.stringify(data); // Finish serializable DTO before writing the access log.
        if (!await ops.recordAccess(language.code)) policy(new AppError(401, "VISIT_SESSION_EXPIRED", "Vé đã hết hạn trước khi cấp gói."));
        return data;
      });
    } catch (error) {
      if (policyErrors.has(error)) throw error;
      throw new AppError(503, "BUNDLE_UNAVAILABLE", "Chưa thể cấp gói nội dung; vui lòng thử lại sau.");
    }
  }
}
module.exports = { ContentService };
