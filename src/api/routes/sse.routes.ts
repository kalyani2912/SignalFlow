import { Router, type Request, type Response } from "express";
import type { EventBus } from "../../services/event-bus.service.js";
import type { PipelineResult } from "../../services/pipeline.service.js";

export function createSSERoutes(eventBus: EventBus): Router {
  const router = Router();

  router.get("/", (req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    res.write(": connected\n\n");

    const onSignal = (result: PipelineResult) => {
      res.write(`data: ${JSON.stringify(result)}\n\n`);
    };

    eventBus.on("signal", onSignal);

    req.on("close", () => {
      eventBus.off("signal", onSignal);
    });
  });

  return router;
}
