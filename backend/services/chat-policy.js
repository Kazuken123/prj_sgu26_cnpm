// Backend-side scope rules for UC-08 A2 / QT-11. They run before any provider
// call, so a refusal never depends on the model's own judgement. Heuristic and
// Vietnamese/English only: they narrow obvious abuse, while the model having no
// tools and sources coming from retrieval stay the main guarantees.

// Asking the chatbot to act (payment, ticket, account, admin) rather than to inform.
const ACTION_VI = /(?:hãy|giúp (?:tôi|mình|em)|làm ơn|cho (?:tôi|mình|em))\s[^.?!]{0,40}?(?:hoàn tiền|hoàn vé|gia hạn|đổi vé|hủy vé|huỷ vé|cấp (?:lại )?vé|thanh toán|chuyển khoản|tạo tài khoản|cấp quyền|phân quyền|xóa|xoá|khóa tài khoản|khoá tài khoản|mở khóa)/iu;
// "Cho tôi hỏi chính sách hoàn tiền thế nào?" asks for information, not for the act.
const INFO_VI = /(?:hỏi|biết|tìm hiểu|giải thích|chính sách|quy định|như thế nào|thế nào|ra sao|bao nhiêu|ở đâu|có được [^.?!]*không|có thể [^.?!]*không)/iu;
const ACTION = [
  /(?:^|[.!?]\s*)(?:please\s+)?(?:refund|extend|cancel|issue|create|delete|grant|reset|transfer|pay|unlock)\b/i,
  /\b(?:can|could|would|will) you\s+(?:please\s+)?(?:refund|extend|cancel|issue|create|delete|grant|reset|transfer|pay|unlock)\b/i,
];
// Attempts to replace the system instructions or to follow instructions found in documents.
const INJECTION = [
  /\b(?:ignore|disregard|forget|override)\s+(?:all\s+|any\s+)?(?:the\s+|your\s+)?(?:previous|prior|above|earlier|system)\s+(?:instructions|rules|prompts?|messages?)/i,
  /(?:bỏ qua|phớt lờ|quên|bỏ hết)\s+(?:mọi|tất cả|các|những|hết)?\s*(?:chỉ dẫn|hướng dẫn|lệnh|chỉ thị)\s*(?:trước|ở trên|của hệ thống)/iu,
  /\byou are now\s+(?:an?\s+|the\s+)?(?:admin|administrator|developer|root|staff|system)\b/i,
  /bạn (?:bây giờ |giờ |hiện )?là (?:quản trị viên|admin|nhà phát triển|hệ thống)/iu,
  /làm theo (?:các |những |mọi )?(?:hướng dẫn|chỉ dẫn|lệnh|chỉ thị) (?:trong|của|ở) (?:đó|tài liệu|ghi chú|văn bản)/iu,
  /\bfollow (?:the |any )?(?:instructions|commands) (?:in|inside|from) (?:the |that |this )?(?:document|note|text|context)/i,
];
const SECRET_TERM = /(?:system prompt|prompt hệ thống|lời nhắc hệ thống|api[ _-]?key|khóa api|khoá api|mã bí mật|secret|mật khẩu|password|access token|biến môi trường|environment variable)/iu;
const STRONG_SECRET = /(?:system prompt|prompt hệ thống|lời nhắc hệ thống|api[ _-]?key|khóa api|khoá api|biến môi trường|environment variable)/iu;
const DISCLOSE = /(?:in ra|tiết lộ|cho (?:tôi |mình )?(?:xem|biết)|hiển thị|đọc|là gì|\bshow\b|\bprint\b|\breveal\b|\btell me\b|\bwhat is\b|\bleak\b|\bdump\b)/iu;
// How-to guidance for acts the visiting rules forbid (UC-08 A2: climbing fences, entering enclosures).
const HOW_TO = /(?:làm sao|làm thế nào|bằng cách nào|cách nào|cách để|hướng dẫn|chỉ (?:tôi|mình|em)|\bhow (?:do|can|to|would|should)\b|\bways? to\b)/iu;
const FORBIDDEN_ACT = /(?:(?:trèo|leo|vượt|nhảy)\s+(?:qua\s+|vào\s+|lên\s+)?(?:hàng\s+)?(?:rào|chuồng)|lẻn vào (?:trong )?chuồng|ném [^.?!]{0,20}vào chuồng|cho thú ăn (?:lén|trộm|đồ lạ)|\bclimb(?:ing)?\s+(?:over\s+|into\s+)?(?:the\s+|a\s+)?(?:fence|barrier|enclosure|cage)|\bsneak into (?:the |an? )?(?:enclosure|cage))/iu;

function classifyQuestion(question) {
  if ((ACTION_VI.test(question) && !INFO_VI.test(question)) || ACTION.some(pattern => pattern.test(question))) return "ACTION_REQUEST";
  if (INJECTION.some(pattern => pattern.test(question))) return "INSTRUCTION_OVERRIDE";
  if (STRONG_SECRET.test(question) || (SECRET_TERM.test(question) && DISCLOSE.test(question))) return "SECRET_REQUEST";
  if (HOW_TO.test(question) && FORBIDDEN_ACT.test(question)) return "UNSAFE_GUIDANCE";
  return null;
}
// Retrieved text is data; a chunk that tries to issue instructions is never offered as context or cited.
function isInstructionLike(text) {
  return typeof text === "string" && INJECTION.some(pattern => pattern.test(text));
}
const SCOPE_REFUSAL = "Trợ lý chỉ trả lời thông tin tham quan Thảo Cầm Viên Sài Gòn; không thể thực hiện thanh toán, vé, tài khoản, " +
  "thao tác quản trị, tiết lộ thông tin hệ thống hoặc hướng dẫn hành vi vi phạm quy định tham quan. Vui lòng liên hệ nhân viên Thảo Cầm Viên. " +
  "/ This assistant only answers visitor information about Saigon Zoo; it cannot handle payments, tickets, accounts or administration, " +
  "reveal system details, or explain how to break visiting rules. Please ask Saigon Zoo staff.";
module.exports = { classifyQuestion, isInstructionLike, SCOPE_REFUSAL };
