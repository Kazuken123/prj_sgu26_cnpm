const { describe, it } = require("node:test");
const assert = require("node:assert");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

describe("Auth Security & Token Helper Test Suite", () => {
  const secretKey = "test-secret-key-123456";
  const rawPassword = "SecurePassword@2026";

  it("Ma hoa mat khau bang bcrypt va kiem tra mat khau chinh xac", async () => {
    const saltRounds = 10;
    const hash = await bcrypt.hash(rawPassword, saltRounds);
    
    assert.notStrictEqual(hash, rawPassword);
    assert.strictEqual(typeof hash, "string");

    const isMatch = await bcrypt.compare(rawPassword, hash);
    assert.strictEqual(isMatch, true);

    const isWrongMatch = await bcrypt.compare("WrongPassword", hash);
    assert.strictEqual(isWrongMatch, false);
  });

  it("Tao va xac thuc JWT token hop le", () => {
    const payload = { userId: 1, email: "staff@example.com", role: "STAFF" };
    const token = jwt.sign(payload, secretKey, { expiresIn: "1h" });

    assert.strictEqual(typeof token, "string");

    const decoded = jwt.verify(token, secretKey);
    assert.strictEqual(decoded.userId, 1);
    assert.strictEqual(decoded.email, "staff@example.com");
    assert.strictEqual(decoded.role, "STAFF");
  });

  it("Tu choi JWT token khong hop le hoac sai secret key", () => {
    const payload = { userId: 2, role: "ADMIN" };
    const token = jwt.sign(payload, secretKey);

    assert.throws(() => {
      jwt.verify(token, "wrong-secret-key");
    });
  });
});
