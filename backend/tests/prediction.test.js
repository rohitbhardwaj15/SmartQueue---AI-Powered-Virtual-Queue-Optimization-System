import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateWaitMinutes,
  getPeakHours,
  getBestVisitSuggestion,
  getTrafficMessage
} from "../src/services/prediction.js";

test("calculateWaitMinutes applies base formula", () => {
  const wait = calculateWaitMinutes({ queueLength: 5, avgServiceMinutes: 10, historicalFactor: 1 });
  assert.equal(wait, 50);
});

test("calculateWaitMinutes has minimum floor", () => {
  const wait = calculateWaitMinutes({ queueLength: 0, avgServiceMinutes: 10, historicalFactor: 1 });
  assert.equal(wait, 2);
});

test("getTrafficMessage buckets correctly", () => {
  assert.equal(getTrafficMessage(10), "Low crowd now");
  assert.equal(getTrafficMessage(25), "Moderate traffic");
  assert.equal(getTrafficMessage(60), "High traffic expected");
});

test("peak hours and suggestions computed", () => {
  const entries = [
    { joinedAt: "2026-04-01T10:15:00.000Z" },
    { joinedAt: "2026-04-01T10:25:00.000Z" },
    { joinedAt: "2026-04-01T15:10:00.000Z" },
    { joinedAt: "2026-04-01T15:20:00.000Z" },
    { joinedAt: "2026-04-01T15:30:00.000Z" }
  ];
  const peaks = getPeakHours(entries);
  assert.equal(peaks[0].hour, 15);
  const suggestion = getBestVisitSuggestion(peaks, new Date("2026-04-01T15:00:00.000Z"));
  assert.match(suggestion, /Best time to visit/);
});
