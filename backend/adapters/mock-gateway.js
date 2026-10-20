const { createHmac, timingSafeEqual } = require("node:crypto");
const { getMockGatewayConfig, getMockWebhookSecret } = require("../config/online-payment");
const fault = code => Object.assign(new Error(code), { code });
function notification(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload) || Object.keys(payload).length !== 4 ||
      Object.keys(payload).some(key => !["paymentRef", "amount", "currency", "status"].includes(key)) ||
      typeof payload.paymentRef !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(payload.paymentRef) ||
      typeof payload.amount !== "string" || !/^(0|[1-9]\d{0,9})(\.\d{1,2})?$/.test(payload.amount) || Number(payload.amount) <= 0 ||
      payload.currency !== "VND" || !["SUCCESS", "FAILED"].includes(payload.status)) throw fault("INVALID_MOCK_WEBHOOK_PAYLOAD");
  const [whole, fraction = ""] = payload.amount.split(".");
  return { paymentRef: payload.paymentRef.toLowerCase(), amount: whole + "." + fraction.padEnd(2, "0"), currency: payload.currency, status: payload.status };
}

// PaymentGateway contract for this milestone:
// assertConfigured() -> { provider, publicBaseUrl }
// createCheckout({paymentRef, amount, currency, expiresAt}, {signal}) -> {provider, paymentUrl}
// The same paymentRef/deadline gives the same URL; no capture/payment happens here.
class MockGateway {
  constructor({ config = getMockGatewayConfig, now = Date.now, webhookSecret = getMockWebhookSecret } = {}) {
    this.config = config; this.now = now; this.webhookSecret = webhookSecret;
  }
  assertConfigured() { return this.config(); }
  async createCheckout({ paymentRef, amount, currency, expiresAt }, { signal } = {}) {
    if (signal?.aborted) throw new Error("GATEWAY_ABORTED");
    const config = this.assertConfigured();
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(paymentRef) ||
        !/^(0|[1-9]\d{0,9})\.\d{2}$/.test(amount) || Number(amount) <= 0 || currency !== "VND" ||
        !(expiresAt instanceof Date) || !Number.isFinite(expiresAt.getTime()) || expiresAt.getTime() <= this.now()) {
      throw new Error("INVALID_MOCK_CHECKOUT");
    }
    return { provider: "MOCK", paymentUrl: new URL("/api/payments/mock-checkout/" + paymentRef, config.publicBaseUrl).href };
  }
  signingSecret() {
    try {
      this.assertConfigured();
      const secret = this.webhookSecret();
      if (typeof secret !== "string" || Buffer.byteLength(secret, "utf8") < 32 || Buffer.byteLength(secret, "utf8") > 1024) throw new Error("INVALID_SECRET");
      return secret;
    } catch { throw fault("MOCK_WEBHOOK_NOT_CONFIGURED"); }
  }
  // Operator/test helper only. Never expose a signing endpoint to the public client.
  createWebhook(payload) {
    const secret = this.signingSecret(), body = Buffer.from(JSON.stringify(notification(payload)), "utf8");
    return { body, signature: "sha256=" + createHmac("sha256", secret).update(body).digest("hex") };
  }
  verifyWebhook(body, signature) {
    const secret = this.signingSecret();
    if (!Buffer.isBuffer(body) || body.length === 0 || body.length > 32768) throw fault("INVALID_MOCK_WEBHOOK_PAYLOAD");
    if (typeof signature !== "string" || !/^sha256=[a-f0-9]{64}$/.test(signature)) throw fault("INVALID_MOCK_WEBHOOK_SIGNATURE");
    const expected = createHmac("sha256", secret).update(body).digest();
    if (!timingSafeEqual(expected, Buffer.from(signature.slice(7), "hex"))) throw fault("INVALID_MOCK_WEBHOOK_SIGNATURE");
    let payload;
    try { payload = JSON.parse(body.toString("utf8")); } catch { throw fault("INVALID_MOCK_WEBHOOK_PAYLOAD"); }
    return notification(payload);
  }
}
module.exports = MockGateway;
