// NOTE: requires `npm install` first (see routes.test.js). Run with: npm test
//
// These tests rely on rate limiters being built fresh per createApp()
// call (see middleware/rateLimiters.js) rather than shared module-level
// singletons - otherwise every test file in the same `node --test` run
// would silently share one global quota and these assertions would be
// order-dependent and flaky.

import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { connectDB } from "../src/config/db.js";
import { createApp } from "../src/app.js";

await connectDB(undefined);

test("POST /api/queue/join is rate-limited after JOIN_RATE_LIMIT_MAX requests", async () => {
  const app = await createApp(null);
  const max = Number(process.env.JOIN_RATE_LIMIT_MAX || 10);
  const payload = { userName: "Limit Test", sector: "bank", branchName: `Branch-rl-${Date.now()}` };

  let lastStatus = 0;
  for (let i = 0; i < max; i += 1) {
    const res = await request(app).post("/api/queue/join").send(payload);
    lastStatus = res.status;
  }
  assert.equal(lastStatus, 201, "the requests within the limit should succeed");

  const overLimitRes = await request(app).post("/api/queue/join").send(payload);
  assert.equal(overLimitRes.status, 429);
});

test("rate limit state is isolated per app instance, not shared globally", async () => {
  const max = Number(process.env.JOIN_RATE_LIMIT_MAX || 10);
  const appOne = await createApp(null);
  const appTwo = await createApp(null);

  for (let i = 0; i < max; i += 1) {
    await request(appOne).post("/api/queue/join").send({ userName: "A", sector: "bank", branchName: "Exhaust-1" });
  }
  const exhausted = await request(appOne).post("/api/queue/join").send({ userName: "A", sector: "bank", branchName: "Exhaust-1" });
  assert.equal(exhausted.status, 429);

  // appTwo has its own limiter instance, so it should be unaffected by
  // appOne's exhausted quota.
  const freshRes = await request(appTwo).post("/api/queue/join").send({ userName: "B", sector: "bank", branchName: "Fresh-2" });
  assert.equal(freshRes.status, 201);
});

test("admin routes are rate-limited independently of the join limiter", async () => {
  process.env.ADMIN_API_KEY = "rl-admin-key";
  const app = await createApp(null);
  const max = Number(process.env.ADMIN_RATE_LIMIT_MAX || 20);

  let lastStatus = 0;
  for (let i = 0; i < max; i += 1) {
    const res = await request(app).get("/api/analytics/overview").set("x-admin-key", "rl-admin-key");
    lastStatus = res.status;
  }
  assert.equal(lastStatus, 200);

  const overLimitRes = await request(app).get("/api/analytics/overview").set("x-admin-key", "rl-admin-key");
  assert.equal(overLimitRes.status, 429);

  delete process.env.ADMIN_API_KEY;
});
