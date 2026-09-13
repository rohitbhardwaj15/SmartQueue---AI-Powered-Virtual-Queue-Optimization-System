import crypto from "node:crypto";
import { QueueEntry } from "../models/QueueEntry.js";
import { Counter } from "../models/Counter.js";
import { useMemoryStore } from "../config/db.js";

const memoryEntries = [];

// In-memory per-sector counters, used only when running without MongoDB
// (local dev / demo mode). Node's single-threaded event loop means this
// Map is safe as long as there is no `await` between the read and the
// write below - which is the case here - so concurrent join requests in
// memory-store mode cannot produce duplicate token numbers either.
const memoryCounters = new Map();

function matches(item, filter) {
  return Object.entries(filter).every(([key, value]) => {
    if (value === undefined || value === null || value === "") return true;
    return item[key] === value;
  });
}

function sortByJoinedAtAsc(a, b) {
  return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
}

function sortByJoinedAtDesc(a, b) {
  return new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime();
}

function sortByPriorityThenJoinedAt(a, b) {
  const priorityDiff = (b.priority ?? 0) - (a.priority ?? 0);
  if (priorityDiff !== 0) return priorityDiff;
  return sortByJoinedAtAsc(a, b);
}

function average(nums) {
  if (!nums.length) return 0;
  return nums.reduce((sum, n) => sum + n, 0) / nums.length;
}

/**
 * Atomically returns the next sequence number for a sector. This replaces
 * the old "read latest token, increment in JS, retry on collision" logic,
 * which had a race window between the read and the insert when two
 * requests for the same sector landed concurrently.
 */
export async function getNextSequence(sector) {
  if (useMemoryStore) {
    const next = (memoryCounters.get(sector) ?? 0) + 1;
    memoryCounters.set(sector, next);
    return next;
  }

  const counter = await Counter.findByIdAndUpdate(
    sector,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
}

export async function countEntries(filter = {}) {
  if (useMemoryStore) {
    return memoryEntries.filter((item) => matches(item, filter)).length;
  }
  return QueueEntry.countDocuments(filter);
}

export async function findEntries(filter = {}, { sort = "asc", limit = 500 } = {}) {
  if (useMemoryStore) {
    const items = memoryEntries.filter((item) => matches(item, filter));
    let sorted;
    if (sort === "priority") {
      sorted = [...items].sort(sortByPriorityThenJoinedAt);
    } else {
      sorted = [...items].sort(sort === "asc" ? sortByJoinedAtAsc : sortByJoinedAtDesc);
    }
    return sorted.slice(0, limit);
  }

  if (sort === "priority") {
    return QueueEntry.find(filter).sort({ priority: -1, joinedAt: 1 }).limit(limit);
  }

  const order = sort === "asc" ? 1 : -1;
  return QueueEntry.find(filter).sort({ joinedAt: order }).limit(limit);
}

export async function createEntry(payload) {
  if (useMemoryStore) {
    const entry = {
      _id: crypto.randomUUID(),
      ...payload,
      joinedAt: payload.joinedAt ?? new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    memoryEntries.push(entry);
    return entry;
  }

  return QueueEntry.create(payload);
}

export async function findEntryById(id) {
  if (useMemoryStore) {
    return memoryEntries.find((item) => item._id === id) ?? null;
  }

  return QueueEntry.findById(id);
}

export async function updateEntryById(id, patch) {
  if (useMemoryStore) {
    const idx = memoryEntries.findIndex((item) => item._id === id);
    if (idx < 0) return null;

    memoryEntries[idx] = {
      ...memoryEntries[idx],
      ...patch,
      updatedAt: new Date().toISOString()
    };
    return memoryEntries[idx];
  }

  return QueueEntry.findByIdAndUpdate(id, patch, { new: true });
}

/**
 * Overview stats for the admin dashboard. In MongoDB mode this is computed
 * entirely server-side via the aggregation pipeline (a $group for status
 * counts, a $facet for avg-wait + peak-hours over the most recent window)
 * instead of pulling thousands of full documents into Node to reduce them
 * in JavaScript.
 */
export async function getOverviewStats({ historyLimit = 600 } = {}) {
  if (useMemoryStore) {
    const waiting = memoryEntries.filter((item) => item.status === "waiting").length;
    const serving = memoryEntries.filter((item) => item.status === "serving").length;
    const history = [...memoryEntries].sort(sortByJoinedAtDesc).slice(0, historyLimit);

    const avgWait = average(history.map((x) => x.predictedWaitMinutes || 0));
    const peakHours = computePeakHoursFromDates(history.map((x) => x.joinedAt));

    return {
      totalInQueue: waiting + serving,
      waiting,
      serving,
      avgWaitingTime: Number(avgWait.toFixed(1)),
      peakHours
    };
  }

  const [statusAgg, [facetResult]] = await Promise.all([
    QueueEntry.aggregate([
      { $match: { status: { $in: ["waiting", "serving"] } } },
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]),
    QueueEntry.aggregate([
      { $sort: { joinedAt: -1 } },
      { $limit: historyLimit },
      {
        $facet: {
          avg: [{ $group: { _id: null, avgWait: { $avg: "$predictedWaitMinutes" } } }],
          peakHours: [
            { $project: { hour: { $hour: "$joinedAt" } } },
            { $group: { _id: "$hour", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 3 },
            { $project: { _id: 0, hour: "$_id", count: 1 } }
          ]
        }
      }
    ])
  ]);

  const waiting = statusAgg.find((s) => s._id === "waiting")?.count ?? 0;
  const serving = statusAgg.find((s) => s._id === "serving")?.count ?? 0;
  const avgWaitingTime = Number((facetResult?.avg?.[0]?.avgWait ?? 0).toFixed(1));
  const peakHours = facetResult?.peakHours ?? [];

  return {
    totalInQueue: waiting + serving,
    waiting,
    serving,
    avgWaitingTime,
    peakHours
  };
}

/**
 * Daily / weekly / hourly trend breakdown, also computed via the
 * aggregation pipeline in MongoDB mode rather than in JS.
 */
export async function getTrendStats({ historyLimit = 1800 } = {}) {
  if (useMemoryStore) {
    const history = [...memoryEntries].sort(sortByJoinedAtDesc).slice(0, historyLimit);
    return computeTrendsFromDates(history.map((x) => x.joinedAt));
  }

  const [facetResult] = await QueueEntry.aggregate([
    { $sort: { joinedAt: -1 } },
    { $limit: historyLimit },
    {
      $facet: {
        daily: [
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$joinedAt" } },
              count: { $sum: 1 }
            }
          },
          { $sort: { _id: 1 } },
          { $project: { _id: 0, date: "$_id", count: 1 } }
        ],
        weekly: [
          { $group: { _id: { $dayOfWeek: "$joinedAt" }, count: { $sum: 1 } } }
        ],
        hourly: [
          { $group: { _id: { $hour: "$joinedAt" }, count: { $sum: 1 } } }
        ]
      }
    }
  ]);

  const dailyTrend = (facetResult?.daily ?? []).slice(-14);

  const weekLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weeklyMap = new Map((facetResult?.weekly ?? []).map((row) => [row._id, row.count]));
  // Mongo's $dayOfWeek is 1 (Sunday) .. 7 (Saturday).
  const weeklyBuckets = weekLabels.map((label, index) => ({
    label,
    count: weeklyMap.get(index + 1) ?? 0
  }));

  const hourlyMap = new Map((facetResult?.hourly ?? []).map((row) => [row._id, row.count]));
  const hourlyHeatmap = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    count: hourlyMap.get(hour) ?? 0
  }));

  return { dailyTrend, weeklyBuckets, hourlyHeatmap };
}

// --- Helpers for memory-store mode (small datasets, plain JS is fine) ---

function computePeakHoursFromDates(dates) {
  const buckets = new Map();
  for (const d of dates) {
    const hour = new Date(d).getHours();
    buckets.set(hour, (buckets.get(hour) ?? 0) + 1);
  }
  return [...buckets.entries()]
    .map(([hour, count]) => ({ hour, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
}

function computeTrendsFromDates(dates) {
  const dailyMap = new Map();
  const weeklyCounts = [0, 0, 0, 0, 0, 0, 0];
  const hourMap = new Map();

  for (const d of dates) {
    const date = new Date(d);
    const dayKey = date.toISOString().slice(0, 10);
    dailyMap.set(dayKey, (dailyMap.get(dayKey) ?? 0) + 1);
    weeklyCounts[date.getDay()] += 1;
    const hour = date.getHours();
    hourMap.set(hour, (hourMap.get(hour) ?? 0) + 1);
  }

  const dailyTrend = [...dailyMap.entries()]
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .slice(-14);

  const weekLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weeklyBuckets = weekLabels.map((label, index) => ({ label, count: weeklyCounts[index] }));

  const hourlyHeatmap = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    count: hourMap.get(hour) ?? 0
  }));

  return { dailyTrend, weeklyBuckets, hourlyHeatmap };
}
