import { Router, type Request, type Response } from "express";
import { SignalIngestionPayload } from "../../domain/signal.js";
import type { PipelineService } from "../../services/pipeline.service.js";
import { asyncHandler } from "../middleware/error.middleware.js";

export function createSignalRoutes(pipeline: PipelineService): Router {
  const router = Router();

  router.post(
    "/",
    asyncHandler(async (req: Request, res: Response) => {
      const result = SignalIngestionPayload.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({ error: "Validation failed", details: result.error.issues });
        return;
      }

      const pipelineResult = await pipeline.processSignal(result.data);
      res.status(201).json(pipelineResult);
    })
  );

  router.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", pipeline: "signal-ingestion" });
  });

  return router;
}
