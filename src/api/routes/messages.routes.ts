import { Router, type Request, type Response } from "express";
import type { MemoryStore } from "../../store/memory-store.js";
import { asyncHandler, AppError } from "../middleware/error.middleware.js";

export function createMessageRoutes(store: MemoryStore): Router {
  const router = Router();

  router.get(
    "/",
    asyncHandler(async (req: Request, res: Response) => {
      const { campaignId, shopperId } = req.query;

      if (campaignId) {
        const messages = await store.getMessagesByCampaign(campaignId as string);
        res.json(messages);
        return;
      }

      if (shopperId) {
        const messages = await store.getMessagesByShopper(shopperId as string);
        res.json(messages);
        return;
      }

      res.status(400).json({ error: "Query parameter 'campaignId' or 'shopperId' is required" });
    })
  );

  router.get(
    "/:id",
    asyncHandler(async (req: Request, res: Response) => {
      const message = await store.getMessage(req.params.id as string);
      if (!message) throw new AppError(404, "Message not found");
      res.json(message);
    })
  );

  return router;
}
