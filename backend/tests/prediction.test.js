import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateWaitMinutes,
  computeHistoricalFactor,
  getAvgServiceMinutes,
  getBestVisitSuggestion,
  getEffectiveQueuePosition,
  getPeakHours,
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

test("computeHistoricalFactor falls back to 1 with insufficient samples", () => {
  const avg = getAvgServiceMinutes("hospital");
  const factor = computeHistoricalFactor([{ status: "done", servedAt: "2026-01-01T00:20:00Z", joinedAt: "2026-01-01T00:00:00Z" }], avg);
  assert.equal(factor, 1);
});

test("computeHistoricalFactor derives a ratio from real completed durations", () => {
  const avg = 10; // minutes
  // 12 completed entries each taking 15 real minutes against a 10-minute baseline -> ratio 1.5
  const history = Array.from({ length: 12 }, (_, i) => ({
    status: "done",
    joinedAt: `2026-01-01T0${i % 9}:00:00.000Z`,
    servedAt: `2026-01-01T0${i % 9}:15:00.000Z`
  }));
  const factor = computeHistoricalFactor(history, avg);
  assert.equal(factor, 1.5);
});

test("computeHistoricalFactor clamps extreme ratios", () => {
  const avg = 10;
  // 15 completed entries each taking 200 real minutes -> raw ratio 20, should clamp to 1.5
  const history = Array.from({ length: 15 }, (_, i) => ({
    status: "done",
    joinedAt: "2026-01-01T00:00:00.000Z",
    servedAt: "2026-01-01T03:20:00.000Z"
  }));
  const factor = computeHistoricalFactor(history, avg);
  assert.equal(factor, 1.5);
});

test("computeHistoricalFactor ignores non-done entries", () => {
  const avg = 10;
  const history = Array.from({ length: 12 }, () => ({ status: "waiting", joinedAt: "2026-01-01T00:00:00.000Z" }));
  const factor = computeHistoricalFactor(history, avg);
  assert.equal(factor, 1);
});

test("getEffectiveQueuePosition counts only equal-or-higher priority entries ahead", () => {
  const waiting = [
    { priority: 0 },
    { priority: 0 },
    { priority: 3 },
    { priority: 5 }
  ];
  // A new priority-0 joiner has everyone (priority >= 0) ahead of them.
  assert.equal(getEffectiveQueuePosition(waiting, 0), 5);
  // A new priority-3 joiner only counts the priority-3 and priority-5 entries as ahead.
  assert.equal(getEffectiveQueuePosition(waiting, 3), 3);
  // A new priority-5 joiner (highest) only has the other priority-5 entry ahead.
  assert.equal(getEffectiveQueuePosition(waiting, 5), 2);
});
