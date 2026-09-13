// NOTE: these tests import queueRepo.js, which in turn imports the
// Mongoose models. They require `npm install` to have been run first
// (mongoose, etc. are not available in every environment this repo is
// checked out in). Run with: npm test

import test from "node:test";
import assert from "node:assert/strict";
import { connectDB } from "../src/config/db.js";
import { getNextSequence } from "../src/services/queueRepo.js";

// Force memory-store mode for these tests (no MONGODB_URI).
await connectDB(undefined);

test("getNextSequence issues strictly increasing, unique numbers sequentially", async () => {
  const sector = `test-sector-sequential-${Date.now()}`;
  const first = await getNextSequence(sector);
  const second = await getNextSequence(sector);
  const third = await getNextSequence(sector);

  assert.equal(second, first + 1);
  assert.equal(third, second + 1);
});

test("getNextSequence never hands out duplicate numbers under concurrent calls", async () => {
  const sector = `test-sector-concurrent-${Date.now()}`;

  // Fire 50 "join" requests for the same sector concurrently - this is
  // exactly the scenario that used to be able to produce duplicate
  // tokens under the old read-latest-then-increment approach.
  const results = await Promise.all(Array.from({ length: 50 }, () => getNextSequence(sector)));

  const unique = new Set(results);
  assert.equal(unique.size, results.length, "expected every sequence number to be unique");

  const sorted = [...results].sort((a, b) => a - b);
  assert.deepEqual(sorted, Array.from({ length: 50 }, (_, i) => i + 1));
});

test("getNextSequence keeps independent counters per sector", async () => {
  const sectorA = `test-sector-a-${Date.now()}`;
  const sectorB = `test-sector-b-${Date.now()}`;

  const a1 = await getNextSequence(sectorA);
  const b1 = await getNextSequence(sectorB);
  const a2 = await getNextSequence(sectorA);

  assert.equal(a1, 1);
  assert.equal(b1, 1);
  assert.equal(a2, 2);
});
