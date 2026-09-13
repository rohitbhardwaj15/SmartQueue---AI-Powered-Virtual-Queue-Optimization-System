import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { createQueueRouter } from "./routes/queue.routes.js";
import { createAnalyticsRouter } from "./routes/analytics.routes.js";
import { createRateLimiters } from "./middleware/rateLimiters.js";

function resolveTrustProxy() {
  const raw = process.env.TRUST_PROXY;
  if (raw === undefined) return 1; // sensible default: one reverse-proxy hop (Render/Vercel edge)
  if (raw === "false") return false;
  if (raw === "true") return true;
  if (!Number.isNaN(Number(raw))) return Number(raw);
  return raw; // e.g. a specific subnet/CIDR string
}

export async function createApp(io) {
  const app = express();

  // Render and Vercel both put SmartQueue behind one reverse-proxy hop.
  // Without telling Express to trust it, req.ip resolves to the proxy's
  // address for every request rather than the real client - which
  // silently breaks per-client rate limiting (everyone shares one bucket,
  // or the limit becomes trivially bypassable depending on header
  // handling). Only trust as many hops as actually exist in front of the
  // app; trusting more than that lets clients spoof their IP via a forged
  // X-Forwarded-For header. Override with TRUST_PROXY if your topology
  // differs.
  app.set("trust proxy", resolveTrustProxy());

  app.use(helmet());
  app.use(cors({ origin: process.env.CLIENT_ORIGIN?.split(",") ?? "*" }));
  app.use(express.json({ limit: "10kb" }));
  app.use(morgan("dev"));

  const { generalLimiter, joinLimiter, adminLimiter } = await createRateLimiters();
  app.use(generalLimiter);

  app.use((req, _res, next) => {
    req.io = io;
    next();
  });

  app.get("/", (_req, res) => {
    res.json({
      service: "SmartQueue API",
      status: "ok",
      endpoints: {
        joinQueue: "POST /api/queue/join",
        listQueue: "GET /api/queue/list",
        predict: "GET /api/queue/predict",
        analyticsOverview: "GET /api/analytics/overview"
      }
    });
  });

  app.get("/health", (_req, res) => res.json({ ok: true, service: "SmartQueue API", time: new Date().toISOString() }));

  app.use("/api/queue", createQueueRouter({ joinLimiter, adminLimiter }));
  app.use("/api/analytics", createAnalyticsRouter({ adminLimiter }));

  // 404 for anything unmatched, so unknown routes don't fall through to
  // the generic error handler with a confusing message.
  app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  // Centralized error handler. Distinguishes validation-style errors
  // (zod, our own validation middleware, Mongoose cast/validation
  // errors) from genuine unexpected failures, instead of collapsing
  // everything into an opaque 500.
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err?.statusCode === 400 || err?.name === "ZodError") {
      return res.status(400).json({
        error: err.message || "Validation failed",
        details: err.details
      });
    }

    if (err?.name === "ValidationError" || err?.name === "CastError") {
      return res.status(400).json({ error: err.message });
    }

    if (err?.statusCode) {
      return res.status(err.statusCode).json({ error: err.message || "Request failed" });
    }

    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  });

  return app;
}
