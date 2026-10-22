# Browser MockGateway control

This endpoint is only for a controlled demonstration. It simulates a provider result and does not collect money or prove a real ticket purchase. It is intentionally public when enabled so a demo visitor can complete the simulated journey; anyone who knows a mock payment reference can invoke it. Keep it disabled wherever that behavior is inappropriate.

## Explicit configuration

`MOCK_PAYMENT_SIMULATION_ENABLED=true` enables the browser control. It defaults to disabled; only the exact string `true` enables it, independently of `NODE_ENV`. `PAYMENT_GATEWAY=mock`, a valid `MOCK_PAYMENT_BASE_URL` and the existing server-side signing configuration are also required. Never send signing credentials to the frontend. The sample configuration keeps the browser control disabled. Existing operator tool `npm run mock:payment -- <paymentRef> SUCCESS|FAILED` remains available independently of the browser flag.

## Contract

`POST /api/payments/mock-checkout/:paymentRef/pay`

Send JSON with exactly one field: `{"status":"SUCCESS"}` or `{"status":"FAILED"}`. Missing or unknown status and extra fields are rejected. Amount, currency, token and session status are never selected by the client.

Disabled: HTTP 404 `MOCK_SIMULATION_DISABLED`. Invalid body: HTTP 400 `INVALID_SIMULATION_INPUT`. Rate limit: HTTP 429 `MOCK_SIMULATION_RATE_LIMITED`. Unavailable Redis protection: HTTP 503 `MOCK_SIMULATION_PROTECTION_UNAVAILABLE`. Limits reuse the existing lookup window/IP/session budgets, with separate simulation keys (the second bucket is per payment reference).

The Router delegates to PaymentService, which obtains the stored checkout, calls MockGateway and reuses signature verification and the existing transactional webhook processing. The response is the existing webhook summary inside `data`, with `Cache-Control: no-store`; it never includes a signature, signing key, exchange code or visitor token. Repeated SUCCESS cannot extend a ticket or reactivate a revoked session. PAID never falls back to FAILED; a valid late SUCCESS may upgrade FAILED as previously approved.

After simulation, the frontend must use the returned payment/session states or query the session. It must not assume every PAID response means an ACTIVE session. Exchange the original online code through the existing exchange API to obtain a visitor token; simulation itself does not issue one.

## Redis and readiness

Redis is required in development as well as other modes. There is no automatic in-memory fallback. Redis unavailability must make readiness fail and protected lookup/code operations refuse safely. A signed provider notification may still record a valid payment through the existing SQL transaction; Redis outage must never mint a visitor token or bypass rate limits.

No schema or migration changes are required.
