/**
 * Express app assembly — no `listen` here so the app is importable and testable.
 * Boot/listen lives in index.ts.
 */
import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import { env } from "./config/env";
import { chatRoutes } from "./routes/chat.routes";
import { errorHandler } from "./middleware/error";

export function createApp(): Express {
  const app = express();

  // CORS restricted to the configured frontend origin ("*" only in local dev).
  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({ status: "ok" });
  });

  app.use("/chat", chatRoutes);

  // 404 for anything unmatched, in the same structured shape.
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: "Not found." });
  });

  // Central error handler must be registered last.
  app.use(errorHandler);

  return app;
}
