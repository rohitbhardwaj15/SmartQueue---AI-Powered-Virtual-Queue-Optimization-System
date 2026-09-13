import test from "node:test";
import assert from "node:assert/strict";
import { requireAdmin } from "../src/middleware/adminAuth.js";

function makeReq(headers = {}) {
  return { header: (name) => headers[name] };
}

function makeRes() {
  const res = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
  return res;
}

test("requireAdmin fails closed (403) when ADMIN_API_KEY is unset and insecure mode is not enabled", () => {
  delete process.env.ADMIN_API_KEY;
  delete process.env.ALLOW_INSECURE_ADMIN;

  const req = makeReq();
  const res = makeRes();
  let nextCalled = false;

  requireAdmin(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
});

test("requireAdmin allows through when ADMIN_API_KEY is unset AND ALLOW_INSECURE_ADMIN=true (explicit opt-in)", () => {
  delete process.env.ADMIN_API_KEY;
  process.env.ALLOW_INSECURE_ADMIN = "true";

  const req = makeReq();
  const res = makeRes();
  let nextCalled = false;

  requireAdmin(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);

  delete process.env.ALLOW_INSECURE_ADMIN;
});

test("requireAdmin rejects a missing or wrong key with 401 when ADMIN_API_KEY is set", () => {
  process.env.ADMIN_API_KEY = "correct-key";

  const wrongReq = makeReq({ "x-admin-key": "wrong-key" });
  const wrongRes = makeRes();
  requireAdmin(wrongReq, wrongRes, () => {
    throw new Error("next() should not be called with a wrong key");
  });
  assert.equal(wrongRes.statusCode, 401);

  const missingReq = makeReq();
  const missingRes = makeRes();
  requireAdmin(missingReq, missingRes, () => {
    throw new Error("next() should not be called with a missing key");
  });
  assert.equal(missingRes.statusCode, 401);

  delete process.env.ADMIN_API_KEY;
});

test("requireAdmin accepts the correct key", () => {
  process.env.ADMIN_API_KEY = "correct-key";

  const req = makeReq({ "x-admin-key": "correct-key" });
  const res = makeRes();
  let nextCalled = false;

  requireAdmin(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, null);

  delete process.env.ADMIN_API_KEY;
});

test("requireAdmin does not throw on keys of different lengths (timing-safe compare)", () => {
  process.env.ADMIN_API_KEY = "a-fairly-long-admin-key";

  const req = makeReq({ "x-admin-key": "short" });
  const res = makeRes();

  assert.doesNotThrow(() => {
    requireAdmin(req, res, () => {});
  });
  assert.equal(res.statusCode, 401);

  delete process.env.ADMIN_API_KEY;
});
