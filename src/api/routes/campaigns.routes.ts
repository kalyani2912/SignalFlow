import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import type { IStore } from "../../store/store.interface.js";
import type { Campaign } from "../../domain/campaign.js";
import type { AnalyticsService } from "../../services/analytics.service.js";
import { asyncHandler, AppError } from "../middleware/error.middleware.js";

const CreateCampaignPayload = z.object({
  name: z.string().min(1),
  brandId: z.string().min(1),
  channels: z.array(z.enum(["sms", "email", "whatsapp", "instagram_dm"])).min(1),
  triggerRules: z
    .array(
      z.object({
        signalType: z.enum([
          "page_view", "add_to_cart", "checkout_start", "checkout_abandon",
          "purchase", "product_view", "search", "custom",
        ]),
        conditions: z.record(z.unknown()).optional(),
      })
    )
    .min(1),
  messageTemplate: z.string().optional(),
  toneGuidelines: z.string().optional(),
});

const UpdateCampaignPayload = z.object({
  name: z.string().min(1).optional(),
  status: z.enum(["draft", "active", "paused", "archived"]).optional(),
  channels: z.array(z.enum(["sms", "email", "whatsapp", "instagram_dm"])).min(1).optional(),
  triggerRules: z
    .array(
      z.object({
        signalType: z.enum([
          "page_view", "add_to_cart", "checkout_start", "checkout_abandon",
          "purchase", "product_view", "search", "custom",
        ]),
        conditions: z.record(z.unknown()).optional(),
      })
    )
    .min(1)
    .optional(),
  messageTemplate: z.string().optional(),
  toneGuidelines: z.string().optional(),
});

export function createCampaignRoutes(store: IStore, analytics: AnalyticsService): Router {
  const router = Router();

  router.post(
    "/",
    asyncHandler(async (req: Request, res: Response) => {
      const result = CreateCampaignPayload.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({ error: "Validation failed", details: result.error.issues });
        return;
      }

      const now = new Date().toISOString();
      const campaign: Campaign = {
        id: uuidv4(),
        ...result.data,
        status: "draft",
        createdAt: now,
        updatedAt: now,
      };

      await store.addCampaign(campaign);
      res.status(201).json(campaign);
    })
  );

  router.get(
    "/",
    asyncHandler(async (req: Request, res: Response) => {
      let campaigns = await store.getAllCampaigns();
      const status = req.query.status as string | undefined;
      if (status) {
        campaigns = campaigns.filter((c) => c.status === status);
      }
      res.json(campaigns);
    })
  );

  router.get(
    "/:id",
    asyncHandler(async (req: Request, res: Response) => {
      const id = req.params.id as string;
      const campaign = await store.getCampaign(id);
      if (!campaign) throw new AppError(404, "Campaign not found");
      res.json(campaign);
    })
  );

  router.put(
    "/:id",
    asyncHandler(async (req: Request, res: Response) => {
      const result = UpdateCampaignPayload.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({ error: "Validation failed", details: result.error.issues });
        return;
      }

      const id = req.params.id as string;
      const updated = await store.updateCampaign(id, result.data);
      if (!updated) throw new AppError(404, "Campaign not found");
      res.json(updated);
    })
  );

  router.get(
    "/:id/analytics",
    asyncHandler(async (req: Request, res: Response) => {
      const id = req.params.id as string;
      const campaign = await store.getCampaign(id);
      if (!campaign) throw new AppError(404, "Campaign not found");
      res.json(analytics.getStats(id));
    })
  );

  return router;
}
