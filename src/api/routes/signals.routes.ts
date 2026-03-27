import { Router, type Request, type Response } from "express";
import { SignalIngestionPayload } from "../../domain/signal.js";
import type { SignalIngestionService } from "../../services/signal-ingestion.service.js";

export function createSignalRoutes(service: SignalIngestionService): Router {
  const router = Router();

  router.post("/", async (req: Request, res: Response) => {
    const result = SignalIngestionPayload.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: "Validation failed", details: result.error.issues });
      return;
    }

    const signal = await service.ingest(result.data);
    res.status(201).json(signal);
  });

  router.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", pipeline: "signal-ingestion" });
  });

  return router;
}
