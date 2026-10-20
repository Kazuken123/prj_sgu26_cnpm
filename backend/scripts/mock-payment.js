require("dotenv").config({ quiet: true });
const MockGateway = require("../adapters/mock-gateway");

// Operator-only demo tool; never return the signing secret/signature to a browser.
async function runMockPayment(args, { gateway = new MockGateway(), request = fetch } = {}) {
  const [paymentRef, status] = args;
  if (args.length !== 2 || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(paymentRef) || !["SUCCESS", "FAILED"].includes(status)) {
    throw new Error("Usage: npm run mock:payment -- <paymentRef> SUCCESS|FAILED");
  }
  const config = gateway.assertConfigured(); gateway.signingSecret();
  const summary = await request(new URL("/api/payments/mock-checkout/" + paymentRef, config.publicBaseUrl), { signal: AbortSignal.timeout(3000) });
  if (!summary.ok) throw new Error("MOCK_CHECKOUT_LOOKUP_FAILED");
  const { data } = await summary.json();
  if (data?.provider !== "MOCK" || data.simulationOnly !== true || data.paymentRef !== paymentRef.toLowerCase()) throw new Error("INVALID_MOCK_CHECKOUT");
  const event = gateway.createWebhook({ paymentRef, amount: data.amount, currency: data.currency, status });
  const response = await request(new URL("/api/payments/webhooks/mock", config.publicBaseUrl), { method: "POST",
    headers: { "Content-Type": "application/json", "X-Mock-Signature": event.signature }, body: event.body, signal: AbortSignal.timeout(3000) });
  const result = await response.json();
  if (!response.ok) throw new Error("MOCK_WEBHOOK_REJECTED_" + response.status);
  return { httpStatus: response.status, paymentRef: result.data?.paymentRef, paymentStatus: result.data?.paymentStatus, duplicate: result.data?.duplicate };
}
if (require.main === module) {
  runMockPayment(process.argv.slice(2)).then(result => console.log(JSON.stringify(result)))
    .catch(() => { console.error("Không gửi được kết quả mock; kiểm tra tham số, cấu hình và trạng thái giao dịch. Không thanh toán lại khi chưa đối soát."); process.exitCode = 1; });
}
module.exports = { runMockPayment };
