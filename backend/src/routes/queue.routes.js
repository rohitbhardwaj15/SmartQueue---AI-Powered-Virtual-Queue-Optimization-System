import { Router } from "express";
import { requireAdmin } from "../middleware/adminAuth.js";
import { validate, joinQueueSchema, listQuerySchema, predictQuerySchema, idParamSchema, prioritySchema } from "../validation/schemas.js";
import {
  countEntries,
  createEntry,
  findEntries,
  findEntryById,
  getNextSequence,
  updateEntryById
} from "../services/queueRepo.js";
import {
  calculateWaitMinutes,
  computeHistoricalFactor,
  getAvgServiceMinutes,
  getBestVisitSuggestion,
  getEffectiveQueuePosition,
  getPeakHours,
  getTrafficMessage
} from "../services/prediction.js";

function asyncHandler(handler) {
  return function wrapped(req, res, next) {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function getTokenPrefix(sector) {
  if (sector === "hospital") return "HSP";
  if (sector === "bank") return "BNK";
  if (sector === "government") return "GOV";
  return "SQ";
}

async function generateToken(sector) {
  const prefix = getTokenPrefix(sector);
  // Uses an atomic per-sector counter (see queueRepo.getNextSequence)
  // instead of "read the latest token, +1 in JS, retry on collision" -
  // that approach had a race window when two joins for the same sector
  // landed concurrently and could hand out duplicate tokens.
  const nextNumber = await getNextSequence(sector);
  return `${prefix}-${String(nextNumber).padStart(4, "0")}`;
}

async function estimateWait({ sector, branchName, priority }) {
  const waitingEntries = await findEntries({ sector, branchName, status: "waiting" }, { sort: "priority", limit: 2000 });
  const allRecent = await findEntries({ sector }, { sort: "desc", limit: 200 });

  const avgServiceMinutes = getAvgServiceMinutes(sector);
  const historicalFactor = computeHistoricalFactor(allRecent, avgServiceMinutes);

  // Effective position accounts for priority: only entries with
  // priority >= this one count as "ahead" in the wait estimate.
  const effectiveQueueLength = getEffectiveQueuePosition(waitingEntries, priority);
  const predictedWaitMinutes = calculateWaitMinutes({
    queueLength: effectiveQueueLength,
    avgServiceMinutes,
    historicalFactor
  });

  return { predictedWaitMinutes, avgServiceMinutes, allRecent };
}

/**
 * Builds the /api/queue router. Rate limiters are injected rather than
 * imported as module-level singletons, so each createApp() call gets its
 * own isolated limiter state (see middleware/rateLimiters.js).
 */
export function createQueueRouter({ joinLimiter, adminLimiter }) {
  const router = Router();

  router.post(
    "/join",
    joinLimiter,
    validate(joinQueueSchema, "body"),
    asyncHandler(async (req, res) => {
      const { userName, phone, sector, branchName } = req.body;
      // Priority always starts at 0 for public joins - see
      // validation/schemas.js for why it isn't accepted here. Staff can
      // raise it afterwards via PATCH /:id/priority.
      const priority = 0;

      const { predictedWaitMinutes, avgServiceMinutes, allRecent } = await estimateWait({ sector, branchName, priority });

      const tokenNumber = await generateToken(sector);
      const entry = await createEntry({
        tokenNumber,
        userName,
        phone,
        sector,
        branchName,
        priority,
        status: "waiting",
        estimatedServiceMinutes: avgServiceMinutes,
        predictedWaitMinutes,
        joinedAt: new Date().toISOString()
      });

      const peakHours = getPeakHours(allRecent);
      const suggestion = getBestVisitSuggestion(peakHours);

      req.io?.emit("queue:joined", {
        tokenNumber: entry.tokenNumber,
        sector,
        branchName,
        predictedWaitMinutes
      });

      return res.status(201).json({
        entry,
        ai: {
          waitMessage: getTrafficMessage(predictedWaitMinutes),
          suggestion,
          peakHours
        }
      });
    })
  );

  router.get(
    "/list",
    validate(listQuerySchema, "query"),
    asyncHandler(async (req, res) => {
      const { sector, branchName, status } = req.query;

      const filter = {};
      if (sector) filter.sector = sector;
      if (branchName) filter.branchName = branchName;
      if (status) filter.status = status;

      // Priority-aware ordering: higher-priority entries surface first in
      // the live queue board, matching how their wait time is estimated.
      const items = await findEntries(filter, { sort: "priority", limit: 500 });
      return res.json(items);
    })
  );

  router.get(
    "/predict",
    validate(predictQuerySchema, "query"),
    asyncHandler(async (req, res) => {
      const { sector, branchName } = req.query;

      const waitingCount = await countEntries({ sector, branchName, status: "waiting" });
      const recent = await findEntries({ sector }, { sort: "desc", limit: 200 });

      const avgServiceMinutes = getAvgServiceMinutes(sector);
      const historicalFactor = computeHistoricalFactor(recent, avgServiceMinutes);
      const predictedWaitMinutes = calculateWaitMinutes({ queueLength: waitingCount, avgServiceMinutes, historicalFactor });

      const peakHours = getPeakHours(recent);
      const suggestion = getBestVisitSuggestion(peakHours);

      return res.json({
        sector,
        branchName,
        queueLength: waitingCount,
        predictedWaitMinutes,
        message: getTrafficMessage(predictedWaitMinutes),
        suggestion,
        peakHours
      });
    })
  );

  router.patch(
    "/:id/serve",
    adminLimiter,
    requireAdmin,
    validate(idParamSchema, "params"),
    asyncHandler(async (req, res) => {
      const item = await findEntryById(req.params.id);
      if (!item) return res.status(404).json({ error: "Queue entry not found." });

      const updated = await updateEntryById(req.params.id, {
        status: "serving",
        servedAt: new Date().toISOString()
      });

      req.io?.emit("queue:updated", { id: updated._id ?? updated.id, status: updated.status });

      return res.json(updated);
    })
  );

  router.patch(
    "/:id/done",
    adminLimiter,
    requireAdmin,
    validate(idParamSchema, "params"),
    asyncHandler(async (req, res) => {
      const item = await findEntryById(req.params.id);
      if (!item) return res.status(404).json({ error: "Queue entry not found." });

      const updated = await updateEntryById(req.params.id, {
        status: "done",
        completedAt: new Date().toISOString()
      });

      req.io?.emit("queue:updated", { id: updated._id ?? updated.id, status: updated.status });

      return res.json(updated);
    })
  );

  // Admin-only: raise (or lower) a waiting entry's priority, e.g. for an
  // emergency case or a staff override. This is the *only* way priority
  // can be set above 0 - see validation/schemas.js for why it's blocked
  // on the public join endpoint. Recomputes the entry's predicted wait
  // using its new effective queue position so the estimate stays honest.
  router.patch(
    "/:id/priority",
    adminLimiter,
    requireAdmin,
    validate(idParamSchema, "params"),
    validate(prioritySchema, "body"),
    asyncHandler(async (req, res) => {
      const item = await findEntryById(req.params.id);
      if (!item) return res.status(404).json({ error: "Queue entry not found." });

      const { priority } = req.body;
      const { predictedWaitMinutes } = await estimateWait({
        sector: item.sector,
        branchName: item.branchName,
        priority
      });

      const updated = await updateEntryById(req.params.id, { priority, predictedWaitMinutes });

      req.io?.emit("queue:updated", { id: updated._id ?? updated.id, status: updated.status, priority });

      return res.json(updated);
    })
  );

  return router;
}
