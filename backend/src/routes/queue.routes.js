import { requireAdmin } from "../middleware/adminAuth.js";
import { Router } from "express";
import {
  countEntries,
  createEntry,
  findEntries,
  findEntryById,
  findLatestTokenBySector,
  updateEntryById
} from "../services/queueRepo.js";
import {
  calculateWaitMinutes,
  getAvgServiceMinutes,
  getBestVisitSuggestion,
  getPeakHours,
  getTrafficMessage
} from "../services/prediction.js";

const router = Router();

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
  const latestToken = await findLatestTokenBySector(sector);
  const latestNumber = latestToken ? Number(latestToken.split("-")[1]) : 0;
  const nextNumber = Number.isFinite(latestNumber) ? latestNumber + 1 : 1;
  return `${prefix}-${String(nextNumber).padStart(4, "0")}`;
}

router.post("/join", asyncHandler(async (req, res) => {
  const { userName, phone = "", sector, branchName, priority = 0 } = req.body;

  if (!userName || !sector || !branchName) {
    return res.status(400).json({ error: "userName, sector and branchName are required." });
  }

  const waitingCount = await countEntries({ sector, branchName, status: "waiting" });

  const allRecent = await findEntries({ sector }, { sort: "desc", limit: 200 });
  const historicalFactor = allRecent.length > 30 ? 1.08 : 1;

  const avgServiceMinutes = getAvgServiceMinutes(sector);
  const predictedWaitMinutes = calculateWaitMinutes({
    queueLength: waitingCount + 1,
    avgServiceMinutes,
    historicalFactor
  });

  let entry;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const tokenNumber = await generateToken(sector);
    try {
      entry = await createEntry({
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
      break;
    } catch (error) {
      if (error?.code !== 11000 || attempt === 2) {
        throw error;
      }
    }
  }

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
}));

router.get("/list", asyncHandler(async (req, res) => {
  const { sector, branchName, status = "waiting" } = req.query;

  const filter = {};
  if (sector) filter.sector = sector;
  if (branchName) filter.branchName = branchName;
  if (status) filter.status = status;

  const items = await findEntries(filter, { sort: "asc", limit: 500 });
  return res.json(items);
}));

router.get("/predict", asyncHandler(async (req, res) => {
  const { sector = "hospital", branchName = "City Center" } = req.query;

  const waitingCount = await countEntries({ sector, branchName, status: "waiting" });
  const recent = await findEntries({ sector }, { sort: "desc", limit: 200 });

  const avgServiceMinutes = getAvgServiceMinutes(sector);
  const historicalFactor = recent.length > 30 ? 1.08 : 1;
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
}));

router.patch("/:id/serve", requireAdmin, asyncHandler(async (req, res) => {
  const item = await findEntryById(req.params.id);
  if (!item) return res.status(404).json({ error: "Queue entry not found." });

  const updated = await updateEntryById(req.params.id, {
    status: "serving",
    servedAt: new Date().toISOString()
  });

  req.io?.emit("queue:updated", { id: updated._id ?? updated.id, status: updated.status });

  return res.json(updated);
}));

router.patch("/:id/done", requireAdmin, asyncHandler(async (req, res) => {
  const item = await findEntryById(req.params.id);
  if (!item) return res.status(404).json({ error: "Queue entry not found." });

  const updated = await updateEntryById(req.params.id, {
    status: "done",
    completedAt: new Date().toISOString()
  });

  req.io?.emit("queue:updated", { id: updated._id ?? updated.id, status: updated.status });

  return res.json(updated);
}));

export default router;
