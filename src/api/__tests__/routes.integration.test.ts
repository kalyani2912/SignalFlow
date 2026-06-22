import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import pino from "pino";
import pinoHttp from "pino-http";
import { MemoryStore } from "../../store/memory-store.js";
import { SignalIngestionService } from "../../services/signal-ingestion.service.js";
import { MessageGenerationService } from "../../services/message-generation.service.js";
import { ChannelRegistry } from "../../channels/channel-registry.js";
import { PipelineService } from "../../services/pipeline.service.js";
import { RateLimiterService } from "../../services/rate-limiter.service.js";
import { AnalyticsService } from "../../services/analytics.service.js";
import { errorMiddleware } from "../middleware/error.middleware.js";
import { createSignalRoutes } from "../routes/signals.routes.js";
import { createCampaignRoutes } from "../routes/campaigns.routes.js";
import { createMessageRoutes } from "../routes/messages.routes.js";

const silentLogger = pino({ level: "silent" });

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(pinoHttp({ logger: silentLogger }));

  const store = new MemoryStore();
  const signalService = new SignalIngestionService(silentLogger, store);
  const messageService = new MessageGenerationService(silentLogger);
  const channelRegistry = new ChannelRegistry(silentLogger);
  const rateLimiter = new RateLimiterService();
  const analytics = new AnalyticsService();
  const pipeline = new PipelineService(
    signalService, messageService, channelRegistry,
    store, rateLimiter, analytics, silentLogger
  );

  app.use("/api/v1/signals", createSignalRoutes(pipeline));
  app.use("/api/v1/campaigns", createCampaignRoutes(store, analytics));
  app.use("/api/v1/messages", createMessageRoutes(store));
  app.get("/health", (_req, res) => res.json({ status: "ok", version: "0.1.0" }));
  app.use(errorMiddleware(silentLogger));

  return { app, store, analytics };
}

describe("API Routes", () => {
  let app: express.Express;
  let store: MemoryStore;

  beforeEach(() => {
    const built = buildApp();
    app = built.app;
    store = built.store;
  });

  describe("GET /health", () => {
    it("returns 200", async () => {
      const res = await request(app).get("/health");
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ok");
    });
  });

  describe("POST /api/v1/signals", () => {
    it("returns 201 with pipeline result", async () => {
      const res = await request(app)
        .post("/api/v1/signals")
        .send({
          shopperId: "s1",
          signalType: "page_view",
          payload: {},
          sessionId: "sess-1",
          source: "web",
        });

      expect(res.status).toBe(201);
      expect(res.body.signal).toBeDefined();
      expect(res.body.signal.shopperId).toBe("s1");
    });

    it("returns 400 for invalid body", async () => {
      const res = await request(app)
        .post("/api/v1/signals")
        .send({ invalid: true });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Validation failed");
    });
  });

  describe("Campaign CRUD", () => {
    const campaignPayload = {
      name: "Cart Abandonment",
      brandId: "brand-1",
      channels: ["sms", "email"],
      triggerRules: [{ signalType: "checkout_abandon" }],
      toneGuidelines: "friendly and urgent",
    };

    it("creates, lists, gets, and updates a campaign", async () => {
      // Create
      const createRes = await request(app)
        .post("/api/v1/campaigns")
        .send(campaignPayload);
      expect(createRes.status).toBe(201);
      const id = createRes.body.id;
      expect(createRes.body.status).toBe("draft");

      // List
      const listRes = await request(app).get("/api/v1/campaigns");
      expect(listRes.status).toBe(200);
      expect(listRes.body).toHaveLength(1);

      // Get by ID
      const getRes = await request(app).get(`/api/v1/campaigns/${id}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.name).toBe("Cart Abandonment");

      // Update
      const updateRes = await request(app)
        .put(`/api/v1/campaigns/${id}`)
        .send({ status: "active" });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.status).toBe("active");
    });

    it("returns 404 for nonexistent campaign", async () => {
      const res = await request(app).get("/api/v1/campaigns/nonexistent");
      expect(res.status).toBe(404);
    });
  });

  describe("Messages", () => {
    it("retrieves messages after pipeline execution", async () => {
      // Create and activate a campaign
      const campRes = await request(app)
        .post("/api/v1/campaigns")
        .send({
          name: "Test",
          brandId: "b1",
          channels: ["sms"],
          triggerRules: [{ signalType: "checkout_abandon" }],
        });
      await request(app)
        .put(`/api/v1/campaigns/${campRes.body.id}`)
        .send({ status: "active" });

      // Send a signal that triggers the campaign
      await request(app)
        .post("/api/v1/signals")
        .send({
          shopperId: "s1",
          signalType: "checkout_abandon",
          payload: {},
          sessionId: "sess-1",
          source: "web",
        });

      // Fetch messages
      const msgRes = await request(app)
        .get(`/api/v1/messages?campaignId=${campRes.body.id}`);
      expect(msgRes.status).toBe(200);
      expect(msgRes.body).toHaveLength(1);
      expect(msgRes.body[0].channel).toBe("sms");
    });

    it("returns 400 without filter params", async () => {
      const res = await request(app).get("/api/v1/messages");
      expect(res.status).toBe(400);
    });
  });

  describe("Campaign Analytics", () => {
    it("returns stats for a campaign", async () => {
      const campRes = await request(app)
        .post("/api/v1/campaigns")
        .send({
          name: "Analytics Test",
          brandId: "b1",
          channels: ["email"],
          triggerRules: [{ signalType: "purchase" }],
        });
      await request(app)
        .put(`/api/v1/campaigns/${campRes.body.id}`)
        .send({ status: "active" });

      await request(app).post("/api/v1/signals").send({
        shopperId: "s1", signalType: "purchase",
        payload: {}, sessionId: "sess-1", source: "web",
      });

      const statsRes = await request(app)
        .get(`/api/v1/campaigns/${campRes.body.id}/analytics`);
      expect(statsRes.status).toBe(200);
      expect(statsRes.body.signalsReceived).toBe(1);
      expect(statsRes.body.messagesSent).toBe(1);
      expect(statsRes.body.deliverySuccessCount).toBe(1);
    });
  });
});
