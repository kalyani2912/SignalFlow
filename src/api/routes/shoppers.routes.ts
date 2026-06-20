import { Router, type Request, type Response } from "express";
import type { MemoryStore } from "../../store/memory-store.js";
import type { RateLimiterService } from "../../services/rate-limiter.service.js";
import { asyncHandler, AppError } from "../middleware/error.middleware.js";

export function createShopperRoutes(
  store: MemoryStore,
  rateLimiter: RateLimiterService
): Router {
  const router = Router();

  router.get(
    "/:id",
    asyncHandler(async (req: Request, res: Response) => {
      const shopperId = req.params.id as string;
      const [signals, messages] = await Promise.all([
        store.getSignalsByShopper(shopperId),
        store.getMessagesByShopper(shopperId),
      ]);

      if (signals.length === 0 && messages.length === 0) {
        throw new AppError(404, "Shopper not found");
      }

      res.json({
        shopperId,
        signals,
        messages,
        rateLimit: {
          remaining: rateLimiter.getRemainingQuota(shopperId),
        },
      });
    })
  );

  return router;
}
