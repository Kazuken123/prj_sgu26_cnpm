// Operator/CI entry point. No runtime dependencies and no credentials in output.
const fs = require("node:fs");
const SHA = /^[a-f0-9]{40}$/;
const BOOT = /^[a-f0-9-]{36}$/;
function fail(code) { const error = new Error(code); error.safeDeployCode = code; throw error; }
function configuration(env) {
  if (!SHA.test(env.GITHUB_SHA || "")) fail("INVALID_DEPLOY_COMMIT");
  let hook, base;
  try { hook = new URL(env.RENDER_DEPLOY_HOOK_URL); base = new URL(env.STAGING_URL); }
  catch { fail("MISSING_OR_INVALID_DEPLOY_CONFIGURATION"); }
  if (hook.protocol !== "https:" || hook.hostname !== "api.render.com" || hook.port || hook.username || hook.password || hook.hash ||
      !/^\/deploy\/srv-[a-z0-9]+$/.test(hook.pathname) || !hook.searchParams.get("key") ||
      [...hook.searchParams.keys()].some(key => !["key", "ref"].includes(key))) fail("INVALID_DEPLOY_HOOK");
  if (base.protocol !== "https:" || !base.hostname.endsWith(".onrender.com") || base.port || base.username || base.password ||
      base.pathname !== "/" || base.search || base.hash) fail("INVALID_STAGING_URL");
  hook.searchParams.set("ref", env.GITHUB_SHA);
  return { hook: hook.href, base: base.origin, commit: env.GITHUB_SHA };
}
async function request(fetchImpl, url, options = {}, timeoutMs = 10000) {
  try {
    return await fetchImpl(url, { ...options, redirect: "error", cache: "no-store", signal: AbortSignal.timeout(timeoutMs) });
  } catch { return null; } // Never propagate a URL containing the deploy key.
}
async function json(response) {
  try {
    if (!response) return null;
    const text = await response.text();
    return text.length <= 32768 ? JSON.parse(text) : null;
  } catch { return null; }
}
function marker(body) {
  const value = body?.deployment;
  return SHA.test(value?.commit || "") && BOOT.test(value?.bootId || "") ? value : null;
}
async function waitForLive({ base, commit, previous, fetchImpl = fetch, now = Date.now,
  sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), maxAttempts = 90, intervalMs = 5000, deadlineMs = 900000 }) {
  const deadline = now() + deadlineMs;
  let stable = null;
  for (let attempt = 0; attempt < maxAttempts && now() < deadline; attempt++) {
    const remaining = Math.max(1, Math.min(10000, deadline - now()));
    const [health, ready] = await Promise.all([
      request(fetchImpl, base + "/health", {}, remaining), request(fetchImpl, base + "/health/ready", {}, remaining),
    ]);
    const [h, r] = await Promise.all([json(health), json(ready)]), a = marker(h), b = marker(r);
    const matched = now() < deadline && health?.status === 200 && ready?.status === 200 && h?.status === "ok" &&
      r?.status === "ok" && r.database === "ready" && r.redis === "ready" &&
      a?.commit === commit && b?.commit === commit && a.bootId === b.bootId && a.bootId !== previous?.bootId;
    if (matched && stable === a.bootId) return { commit, bootId: a.bootId, attempts: attempt + 1 };
    stable = matched ? a.bootId : null;
    if (attempt + 1 < maxAttempts && now() < deadline) await sleep(Math.min(intervalMs, deadline - now()));
  }
  fail("STAGING_NEW_VERSION_NOT_READY_BEFORE_DEADLINE");
}
async function smoke(base, fetchImpl) {
  const page = await request(fetchImpl, base + "/", { headers: { Accept: "text/html" } });
  if (page?.status !== 200) fail("STAGING_FRONTEND_UNAVAILABLE");
  let html; try { html = await page.text(); } catch { fail("STAGING_FRONTEND_UNAVAILABLE"); }
  if (!html.includes('id="root"')) fail("STAGING_FRONTEND_INVALID");
  for (const path of ["/api/visits/me", "/api/content/bundle?languageCode=vi", "/api/admin/pois"]) {
    const response = await request(fetchImpl, base + path);
    if (response?.status !== 401) fail("STAGING_AUTH_BOUNDARY_FAILED");
    await response.body?.cancel().catch(() => {});
  }
  return { frontend: "OK", unauthenticatedRoutesRejected: 3 };
}
async function deployRender(env, { fetchImpl = fetch, now = Date.now, sleep, log = () => {} } = {}) {
  const config = configuration(env);
  // Wake the free instance and capture its old process before triggering anything.
  const baseline = await request(fetchImpl, config.base + "/health", {}, 60000), before = await json(baseline);
  if (baseline?.status !== 200 || before?.status !== "ok") fail("STAGING_BASELINE_UNAVAILABLE_NO_DEPLOY_TRIGGERED");
  const previous = marker(before);
  const response = await request(fetchImpl, config.hook, { method: "POST" }, 20000);
  if (!response || ![200, 202].includes(response.status)) fail("RENDER_DEPLOY_TRIGGER_UNCONFIRMED_DO_NOT_BLINDLY_RETRY");
  const body = await json(response), id = body?.deploy?.id ?? body?.id;
  // 202 may have no deploy ID; still require a new live process of this exact SHA.
  const deployId = typeof id === "string" && /^dep-[a-z0-9]+$/.test(id) ? id : null;
  log({ phase: "TRIGGER_ACCEPTED_NOT_YET_VERIFIED", commit: config.commit, deployId, queued: response.status === 202 });
  const live = await waitForLive({ ...config, previous, fetchImpl, now, sleep });
  const checks = await smoke(config.base, fetchImpl);
  // Check again after smoke, so a concurrent version swap cannot pass unnoticed.
  const finalResponse = await request(fetchImpl, config.base + "/health/ready"), final = await json(finalResponse);
  if (finalResponse?.status !== 200 || marker(final)?.commit !== live.commit || marker(final)?.bootId !== live.bootId ||
      final.database !== "ready" || final.redis !== "ready") fail("STAGING_CHANGED_DURING_SMOKE");
  return { outcome: "VERIFIED_NEW_PROCESS", ...live, deployId, queued: response.status === 202, ...checks };
}
if (require.main === module) {
  deployRender(process.env, { log: result => console.log(JSON.stringify(result)) }).then(result => {
    console.log(JSON.stringify(result));
    if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
      `### Render staging verified\nCommit: ${result.commit}\n\nNew process healthy; MySQL + Redis ready; frontend and 3 authentication boundaries passed.\n`);
  }).catch(error => {
    console.error(JSON.stringify({ outcome: "NOT_VERIFIED", code: error.safeDeployCode || "DEPLOY_CHECK_FAILED" }));
    process.exitCode = 1;
  });
}
module.exports = { configuration, marker, waitForLive, deployRender, smoke };
