const { test } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { configuration, waitForLive, deployRender, smoke } = require("../scripts/deploy-render");
const { deploymentMetadata } = require("../config/deployment");
const commit = "a".repeat(40), oldCommit = "b".repeat(40);
const oldBoot = "11111111-1111-4111-8111-111111111111", newBoot = "22222222-2222-4222-8222-222222222222";
const base = "https://tcv-staging.onrender.com";
const env = { GITHUB_SHA: commit, STAGING_URL: base, RENDER_DEPLOY_HOOK_URL: "https://api.render.com/deploy/srv-test?key=test-only-secret" };
const reply = (status, body) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const health = (sha = commit, boot = newBoot) => ({ status: "ok", database: "ready", redis: "ready", deployment: { commit: sha, bootId: boot } });
test("CD configuration pins the exact SHA and rejects destinations that could disclose the hook", () => {
  assert.equal(new URL(configuration(env).hook).searchParams.get("ref"), commit);
  for (const patch of [{ GITHUB_SHA: "main" }, { RENDER_DEPLOY_HOOK_URL: "https://evil.invalid/deploy/srv-test?key=secret" },
    { RENDER_DEPLOY_HOOK_URL: "http://api.render.com/deploy/srv-test?key=secret" },
    { RENDER_DEPLOY_HOOK_URL: "https://api.render.com/deploy/srv-test?key=secret&imgURL=x" },
    { RENDER_DEPLOY_HOOK_URL: "" }, { STAGING_URL: "https://tcv-staging.onrender.com.evil.invalid" }]) {
    assert.throws(() => configuration({ ...env, ...patch }), error => !error.message.includes("secret"));
  }
});
test("deployment metadata exposes only a validated Render SHA and one stable process identifier", () => {
  assert.deepEqual(deploymentMetadata({}), {});
  assert.deepEqual(deploymentMetadata({ RENDER: "true", RENDER_GIT_COMMIT: "secret-token" }), {});
  const a = deploymentMetadata({ RENDER: "true", RENDER_GIT_COMMIT: commit, DB_PASSWORD: "private" });
  assert.deepEqual(a, deploymentMetadata({ RENDER: "true", RENDER_GIT_COMMIT: commit }));
  assert.deepEqual(Object.keys(a.deployment).sort(), ["bootId", "commit"]);
  assert.match(a.deployment.bootId, /^[a-f0-9-]{36}$/);
});
test("old healthy SHA, same-SHA old process, failed readiness and migration failure cannot pass CD", async () => {
  for (const scenario of ["old-sha", "old-process", "redis-down", "mysql-down", "migration-failed", "split-process"]) {
    let requests = 0;
    await assert.rejects(waitForLive({ base, commit, previous: { commit, bootId: oldBoot }, maxAttempts: 3, intervalMs: 0,
      fetchImpl: async url => {
        requests++;
        if (scenario === "old-sha" || scenario === "migration-failed") return reply(200, health(oldCommit, oldBoot));
        if (scenario === "old-process") return reply(200, health(commit, oldBoot));
        if (scenario.endsWith("down") && url.endsWith("ready")) return reply(503, { code: "DEPENDENCY_UNAVAILABLE" });
        if (scenario === "split-process") return reply(200, health(commit, url.endsWith("ready") ? oldBoot : newBoot));
        return reply(200, health());
      } }), /STAGING_NEW_VERSION_NOT_READY/);
    assert.equal(requests, 6);
  }
});
test("CD waits for two consistent new-process probes and enforces its total deadline", async () => {
  let calls = 0;
  const result = await waitForLive({ base, commit, previous: { bootId: oldBoot }, intervalMs: 0,
    fetchImpl: async () => reply(200, ++calls <= 2 ? health(oldCommit, oldBoot) : health()) });
  assert.equal(result.attempts, 3);
  let time = 0;
  await assert.rejects(waitForLive({ base, commit, deadlineMs: 10, intervalMs: 100, now: () => time,
    sleep: async ms => { time += ms; }, fetchImpl: async () => reply(503, {}) }), /BEFORE_DEADLINE/);
  assert.equal(time, 10);
});
test("hook success alone, including a queued deploy, never means the release is verified", async () => {
  const calls = [], logs = [];
  const result = await deployRender(env, { sleep: async () => {}, log: value => logs.push(value), fetchImpl: async (url, options) => {
    calls.push({ url, options });
    if (url.includes("api.render.com")) return reply(202, {});
    if (calls.length === 1) return reply(200, health(oldCommit, oldBoot));
    if (url === base + "/") return new Response('<div id="root"></div>');
    if (url.includes("/api/")) return reply(401, {});
    return reply(200, health());
  } });
  assert.equal(result.outcome, "VERIFIED_NEW_PROCESS"); assert.equal(result.queued, true);
  assert.equal(result.unauthenticatedRoutesRejected, 3);
  const trigger = calls.find(c => c.url.includes("api.render.com"));
  assert.equal(trigger.options.method, "POST"); assert.equal(trigger.options.redirect, "error");
  assert.equal(new URL(trigger.url).searchParams.get("ref"), commit);
  assert.equal(JSON.stringify(logs).includes("test-only-secret"), false);
});
test("unavailable baseline does not trigger a deploy; hook failures do not leak the secret or retry POST", async () => {
  let calls = 0;
  await assert.rejects(deployRender(env, { fetchImpl: async () => { calls++; return reply(503, {}); } }), /BASELINE_UNAVAILABLE/);
  assert.equal(calls, 1);
  for (const outcome of [401, 500, "network"]) {
    let triggers = 0;
    await assert.rejects(deployRender(env, { fetchImpl: async url => {
      if (!url.includes("api.render.com")) return reply(200, health());
      triggers++; if (outcome === "network") throw new Error(env.RENDER_DEPLOY_HOOK_URL);
      return reply(outcome, { private: "secret" });
    } }), error => error.message.includes("UNCONFIRMED") && !error.message.includes("secret"));
    assert.equal(triggers, 1);
  }
});
test("smoke refuses an unprotected API or missing compiled frontend", async () => {
  await assert.rejects(smoke(base, async () => new Response("no frontend")), /FRONTEND_INVALID/);
  await assert.rejects(smoke(base, async url => url === base + "/" ? new Response('<div id="root"></div>') : reply(200, {})), /AUTH_BOUNDARY/);
});
test("a release swap after smoke is a failed deployment check", async () => {
  let probes = 0;
  await assert.rejects(deployRender(env, { sleep: async () => {}, fetchImpl: async url => {
    if (url.includes("api.render.com")) return reply(200, { deploy: { id: "dep-test" } });
    if (url === base + "/") return new Response('<div id="root"></div>');
    if (url.includes("/api/")) return reply(401, {});
    probes++; return reply(200, probes === 1 ? health(oldCommit, oldBoot) : probes > 5 ? health(oldCommit, oldBoot) : health());
  } }), /CHANGED_DURING_SMOKE/);
});
test("health HTTP publishes matching safe metadata without caching and preserves readiness failures", async t => {
  const prior = { RENDER: process.env.RENDER, RENDER_GIT_COMMIT: process.env.RENDER_GIT_COMMIT };
  process.env.RENDER = "true"; process.env.RENDER_GIT_COMMIT = commit;
  let down = false;
  const { createApp } = require("../server");
  const server = http.createServer(createApp({ healthService: { ready: async () => {
    if (down) throw new (require("../utils/app-error"))(503, "REDIS_UNAVAILABLE", "Redis unavailable");
    return { status: "ok", database: "ready", redis: "ready" };
  } } }));
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
    for (const [key, value] of Object.entries(prior)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  const h = await fetch(url + "/health"), r = await fetch(url + "/health/ready");
  assert.equal(h.headers.get("cache-control"), "no-store"); assert.equal(r.headers.get("cache-control"), "no-store");
  assert.deepEqual((await h.json()).deployment, (await r.json()).deployment);
  down = true; assert.equal((await fetch(url + "/health/ready")).status, 503);
});
