import cors from "cors";
import express from "express";
import morgan from "morgan";
import queueRoutes from "./routes/queue.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";

export function createApp(io) {
  const app = express();

  app.use(cors({ origin: process.env.CLIENT_ORIGIN?.split(",") ?? "*" }));
  app.use(express.json());
  app.use(morgan("dev"));

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

  app.use("/api/queue", queueRoutes);
  app.use("/api/analytics", analyticsRoutes);

  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}
