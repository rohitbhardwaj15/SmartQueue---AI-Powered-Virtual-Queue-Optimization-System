import { Router } from "express";
import { requireAdmin } from "../middleware/adminAuth.js";
import { getOverviewStats, getTrendStats } from "../services/queueRepo.js";

function asyncHandler(handler) {
  return function wrapped(req, res, next) {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

export function createAnalyticsRouter({ adminLimiter }) {
  const router = Router();
  router.use(adminLimiter);
  router.use(requireAdmin);

  // Overview/trends are computed via MongoDB's aggregation pipeline
  // (see queueRepo.getOverviewStats / getTrendStats) instead of pulling
  // up to ~2000 raw documents into Node and reducing them in JavaScript
  // on every dashboard load.
  router.get(
    "/overview",
    asyncHandler(async (_req, res) => {
      const stats = await getOverviewStats();
      return res.json(stats);
    })
  );

  router.get(
    "/trends",
    asyncHandler(async (_req, res) => {
      const trends = await getTrendStats();
      return res.json(trends);
    })
  );

  return router;
}
