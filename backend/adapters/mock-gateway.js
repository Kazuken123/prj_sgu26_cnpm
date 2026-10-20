const { getMockGatewayConfig } = require("../config/online-payment");

// PaymentGateway contract for this milestone:
// assertConfigured() -> { provider, publicBaseUrl }
// createCheckout({paymentRef, amount, currency, expiresAt}, {signal}) -> {provider, paymentUrl}
// The same paymentRef/deadline gives the same URL; no capture/payment happens here.
class MockGateway {
  constructor({ config = getMockGatewayConfig, now = Date.now } = {}) { this.config = config; this.now = now; }
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
}
module.exports = MockGateway;
