import { requireAdmin } from "../middleware/adminAuth.js";
import { Router } from "express";
import { findEntries } from "../services/queueRepo.js";
import { getPeakHours } from "../services/prediction.js";

const router = Router();
router.use(requireAdmin);

function asyncHandler(handler) {
  return function wrapped(req, res, next) {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function average(nums) {
  if (!nums.length) return 0;
  return nums.reduce((sum, n) => sum + n, 0) / nums.length;
}

router.get("/overview", asyncHandler(async (_req, res) => {
  const waitingItems = await findEntries({ status: "waiting" }, { sort: "desc", limit: 2000 });
  const servingItems = await findEntries({ status: "serving" }, { sort: "desc", limit: 2000 });

  const history = await findEntries({}, { sort: "desc", limit: 600 });
  const avgWait = average(history.map((x) => x.predictedWaitMinutes || 0));
  const peakHours = getPeakHours(history);

  return res.json({
    totalInQueue: waitingItems.length + servingItems.length,
    waiting: waitingItems.length,
    serving: servingItems.length,
    avgWaitingTime: Number(avgWait.toFixed(1)),
    peakHours
  });
}));

router.get("/trends", asyncHandler(async (_req, res) => {
  const history = await findEntries({}, { sort: "desc", limit: 1800 });

  const dailyMap = new Map();
  const hourMap = new Map();

  for (const item of history) {
    const date = new Date(item.joinedAt);
    const dayKey = date.toISOString().slice(0, 10);
    const hour = date.getHours();

    dailyMap.set(dayKey, (dailyMap.get(dayKey) ?? 0) + 1);
    hourMap.set(hour, (hourMap.get(hour) ?? 0) + 1);
  }

  const dailyTrend = [...dailyMap.entries()]
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .slice(-14);

  const weeklyBuckets = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label, index) => {
    const count = history.filter((item) => new Date(item.joinedAt).getDay() === index).length;
    return { label, count };
  });

  const hourlyHeatmap = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    count: hourMap.get(hour) ?? 0
  }));

  return res.json({ dailyTrend, weeklyBuckets, hourlyHeatmap });
}));

export default router;
