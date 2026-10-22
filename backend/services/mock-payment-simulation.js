const { createHash } = require("node:crypto");
const AppError = require("../utils/app-error");

// Browser demo control, not a payment provider. The existing webhook service
// remains responsible for signature verification, amount checks and atomic writes.
async function simulateMockPayment(service, paymentRef, input, ipAddress) {
  if (service.simulationEnabled() !== true) {
    throw new AppError(404, "MOCK_SIMULATION_DISABLED", "Thao tác mô phỏng chưa được bật.");
  }
  if (!input || typeof input !== "object" || Array.isArray(input) ||
      Object.keys(input).length !== 1 || !["SUCCESS", "FAILED"].includes(input.status)) {
    throw new AppError(400, "INVALID_SIMULATION_INPUT", "Chỉ gửi status SUCCESS hoặc FAILED cho thanh toán mô phỏng.");
  }
  let allowed;
  try {
    if (typeof ipAddress !== "string" || !ipAddress) throw new Error("MISSING_IP");
    const key = value => createHash("sha256").update(value).digest("hex");
    allowed = await service.redis.consumeLookup([
      "tcv:mock-simulation:ip:" + key(ipAddress),
      "tcv:mock-simulation:payment:" + key(String(paymentRef).toLowerCase())
    ], service.lookupConfig());
  } catch {
    throw new AppError(503, "MOCK_SIMULATION_PROTECTION_UNAVAILABLE", "Chưa thể bảo vệ thao tác mô phỏng; vui lòng thử lại.");
  }
  if (!allowed) throw new AppError(429, "MOCK_SIMULATION_RATE_LIMITED", "Đã vượt giới hạn mô phỏng; vui lòng thử lại sau.");
  const summary = await service.mockCheckout(paymentRef);
  let event;
  try {
    event = service.gateway.createWebhook({ paymentRef: summary.paymentRef, amount: summary.amount,
      currency: summary.currency, status: input.status });
  } catch {
    throw new AppError(503, "MOCK_SIMULATION_UNAVAILABLE", "Chưa thể tạo kết quả mô phỏng.");
  }
  return service.processMockWebhook(event.body, event.signature);
}
module.exports = { simulateMockPayment };
