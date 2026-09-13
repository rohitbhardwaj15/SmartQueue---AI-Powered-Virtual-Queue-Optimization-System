// NOTE: requires `npm install` first (express, supertest, zod, helmet,
// express-rate-limit are not vendored into the repo). Run with: npm test
//
// Runs against the in-memory store (no MongoDB needed) so these tests
// are self-contained. Each test that needs isolated rate-limit or admin
// state calls createApp() fresh, since rate limiters are now built
// per-app-instance rather than as shared module singletons.

import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { connectDB } from "../src/config/db.js";
import { createApp } from "../src/app.js";

await connectDB(undefined); // force memory-store mode
delete process.env.ADMIN_API_KEY;
delete process.env.ALLOW_INSECURE_ADMIN;

const app = await createApp(null); // no real Socket.io server needed for these tests

test("POST /api/queue/join rejects missing required fields with 400", async () => {
  const res = await request(app).post("/api/queue/join").send({ userName: "Rohit" });
  assert.equal(res.status, 400);
  assert.ok(res.body.error);
});

test("POST /api/queue/join rejects an invalid sector with 400", async () => {
  const res = await request(app).post("/api/queue/join").send({
    userName: "Rohit",
    sector: "not-a-real-sector",
    branchName: "City Center"
  });
  assert.equal(res.status, 400);
});

test("POST /api/queue/join succeeds and returns a token + prediction for valid input", async () => {
  const res = await request(app).post("/api/queue/join").send({
    userName: "Rohit",
    phone: "9876543210",
    sector: "bank",
    branchName: `Branch-${Date.now()}`
  });

  assert.equal(res.status, 201);
  assert.match(res.body.entry.tokenNumber, /^BNK-\d{4}$/);
  assert.equal(typeof res.body.entry.predictedWaitMinutes, "number");
  assert.ok(res.body.ai.waitMessage);
});

test("POST /api/queue/join ignores a client-supplied priority (public joins always start at 0)", async () => {
  // Regression test: priority used to be accepted directly from the
  // public request body, which meant anyone could self-assign priority
  // up to 5 and jump the whole queue once priority started affecting
  // ordering/wait estimates. It must now be silently ignored here.
  const res = await request(app).post("/api/queue/join").send({
    userName: "Would-Be Queue Jumper",
    sector: "hospital",
    branchName: `Branch-noabuse-${Date.now()}`,
    priority: 5
  });

  assert.equal(res.status, 201);
  assert.equal(res.body.entry.priority, 0);
});

test("GET /api/queue/list returns entries for a sector/branch", async () => {
  const branchName = `Branch-list-${Date.now()}`;
  await request(app).post("/api/queue/join").send({
    userName: "Alice",
    sector: "hospital",
    branchName
  });

  const res = await request(app).get("/api/queue/list").query({ sector: "hospital", branchName });
  assert.equal(res.status, 200);
  assert.equal(res.body.length, 1);
  assert.equal(res.body[0].userName, "Alice");
});

test("GET /api/queue/list rejects an invalid status filter with 400", async () => {
  const res = await request(app).get("/api/queue/list").query({ status: "not-a-status" });
  assert.equal(res.status, 400);
});

test("GET /api/queue/predict returns a prediction using sector/branch defaults", async () => {
  const res = await request(app).get("/api/queue/predict");
  assert.equal(res.status, 200);
  assert.equal(res.body.sector, "hospital");
  assert.equal(res.body.branchName, "City Center");
  assert.equal(typeof res.body.predictedWaitMinutes, "number");
  assert.ok(res.body.message);
});

test("admin routes return 403 when ADMIN_API_KEY is not configured", async () => {
  const res = await request(app).get("/api/analytics/overview");
  assert.equal(res.status, 403);
});

test("admin routes work once ADMIN_API_KEY is configured and the key is provided", async () => {
  process.env.ADMIN_API_KEY = "test-admin-key";
  const authedApp = await createApp(null);

  const unauthed = await request(authedApp).get("/api/analytics/overview");
  assert.equal(unauthed.status, 401);

  const authed = await request(authedApp)
    .get("/api/analytics/overview")
    .set("x-admin-key", "test-admin-key");
  assert.equal(authed.status, 200);
  assert.ok("totalInQueue" in authed.body);

  delete process.env.ADMIN_API_KEY;
});

test("PATCH /:id/serve and /:id/done require admin auth and update status", async () => {
  process.env.ADMIN_API_KEY = "test-admin-key";
  const authedApp = await createApp(null);

  const joinRes = await request(authedApp).post("/api/queue/join").send({
    userName: "Bob",
    sector: "government",
    branchName: `Branch-serve-${Date.now()}`
  });
  const id = joinRes.body.entry._id;

  const noAuth = await request(authedApp).patch(`/api/queue/${id}/serve`);
  assert.equal(noAuth.status, 401);

  const serveRes = await request(authedApp).patch(`/api/queue/${id}/serve`).set("x-admin-key", "test-admin-key");
  assert.equal(serveRes.status, 200);
  assert.equal(serveRes.body.status, "serving");

  const doneRes = await request(authedApp).patch(`/api/queue/${id}/done`).set("x-admin-key", "test-admin-key");
  assert.equal(doneRes.status, 200);
  assert.equal(doneRes.body.status, "done");

  delete process.env.ADMIN_API_KEY;
});

test("PATCH /:id/priority requires admin auth and recalculates the wait estimate", async () => {
  process.env.ADMIN_API_KEY = "priority-test-key";
  const authedApp = await createApp(null);

  const joinRes = await request(authedApp).post("/api/queue/join").send({
    userName: "Priority Test",
    sector: "hospital",
    branchName: `Branch-priority-${Date.now()}`
  });
  const id = joinRes.body.entry._id;
  assert.equal(joinRes.body.entry.priority, 0);

  const noAuth = await request(authedApp).patch(`/api/queue/${id}/priority`).send({ priority: 5 });
  assert.equal(noAuth.status, 401);

  const badBody = await request(authedApp)
    .patch(`/api/queue/${id}/priority`)
    .set("x-admin-key", "priority-test-key")
    .send({ priority: 99 });
  assert.equal(badBody.status, 400);

  const res = await request(authedApp)
    .patch(`/api/queue/${id}/priority`)
    .set("x-admin-key", "priority-test-key")
    .send({ priority: 5 });

  assert.equal(res.status, 200);
  assert.equal(res.body.priority, 5);

  delete process.env.ADMIN_API_KEY;
});

test("joining a queue emits a queue:joined socket event", async () => {
  const events = [];
  const mockIo = { emit: (name, payload) => events.push({ name, payload }) };
  const socketApp = await createApp(mockIo);

  const res = await request(socketApp).post("/api/queue/join").send({
    userName: "Socket Test",
    sector: "government",
    branchName: `Branch-socket-${Date.now()}`
  });

  assert.equal(res.status, 201);
  assert.equal(events.length, 1);
  assert.equal(events[0].name, "queue:joined");
  assert.equal(events[0].payload.tokenNumber, res.body.entry.tokenNumber);
});

test("serving/completing an entry emits queue:updated socket events", async () => {
  const events = [];
  const mockIo = { emit: (name, payload) => events.push({ name, payload }) };
  process.env.ADMIN_API_KEY = "socket-test-key";
  const socketApp = await createApp(mockIo);

  const joinRes = await request(socketApp).post("/api/queue/join").send({
    userName: "Socket Test 2",
    sector: "bank",
    branchName: `Branch-socket2-${Date.now()}`
  });
  const id = joinRes.body.entry._id;

  await request(socketApp).patch(`/api/queue/${id}/serve`).set("x-admin-key", "socket-test-key");
  await request(socketApp).patch(`/api/queue/${id}/done`).set("x-admin-key", "socket-test-key");

  const updatedEvents = events.filter((e) => e.name === "queue:updated");
  assert.equal(updatedEvents.length, 2);
  assert.equal(updatedEvents[0].payload.status, "serving");
  assert.equal(updatedEvents[1].payload.status, "done");

  delete process.env.ADMIN_API_KEY;
});

test("unknown routes return 404", async () => {
  const res = await request(app).get("/api/does-not-exist");
  assert.equal(res.status, 404);
});
