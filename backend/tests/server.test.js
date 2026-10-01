const { describe, it, before, after } = require("node:test");
const assert = require("node:assert");
const http = require("node:http");

process.env.NODE_ENV = "test";
const app = require("../server");

describe("API Server Endpoints Test Suite", () => {
  let server;
  let baseUrl;

  before((_, done) => {
    server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      done();
    });
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
    const pool = require("../config/database");
    if (pool && typeof pool.end === "function") {
      try {
        await pool.end();
      } catch (_) {}
    }
  });

  it("GET / tra ve trang thai 200 va noi dung hoat dong", async () => {
    const res = await fetch(`${baseUrl}/`);
    assert.strictEqual(res.status, 200);
    const text = await res.text();
    assert.ok(text.includes("API"));
  });

  it("GET /health tra ve status 200 va json status ok", async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.status, "ok");
    assert.strictEqual(data.service, "food-tour-api");
    assert.ok(data.timestamp);
  });

  it("GET /non-existent-route tra ve ma 404", async () => {
    const res = await fetch(`${baseUrl}/api/v1/not-found`);
    assert.strictEqual(res.status, 404);
  });
});
