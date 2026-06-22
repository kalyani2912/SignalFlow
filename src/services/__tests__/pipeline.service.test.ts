import { describe, it, expect, beforeEach } from "vitest";
import pino from "pino";
import { PipelineService } from "../pipeline.service.js";
import { SignalIngestionService } from "../signal-ingestion.service.js";
import { MessageGenerationService } from "../message-generation.service.js";
import { ChannelRegistry } from "../../channels/channel-registry.js";
import { MemoryStore } from "../../store/memory-store.js";
import { RateLimiterService } from "../rate-limiter.service.js";
import { AnalyticsService } from "../analytics.service.js";
import type { Campaign } from "../../domain/campaign.js";

const silentLogger = pino({ level: "silent" });

const makeCampaign = (overrides: Partial<Campaign>): Campaign => ({
  id: "camp-1",
  name: "Test Campaign",
  brandId: "brand-1",
  status: "active",
  channels: ["sms", "email"],
  triggerRules: [{ signalType: "checkout_abandon" }],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe("PipelineService", () => {
  let store: MemoryStore;
  let pipeline: PipelineService;
  let analytics: AnalyticsService;

  beforeEach(() => {
    store = new MemoryStore();
    const signalService = new SignalIngestionService(silentLogger, store);
    const messageService = new MessageGenerationService(silentLogger);
    const channelRegistry = new ChannelRegistry(silentLogger);
    const rateLimiter = new RateLimiterService({ maxPerWindow: 10 });
    analytics = new AnalyticsService();
    pipeline = new PipelineService(
      signalService,
      messageService,
      channelRegistry,
      store,
      rateLimiter,
      analytics,
      silentLogger
    );
  });

  it("processes signal end-to-end with matching campaign", async () => {
    await store.addCampaign(makeCampaign({}));

    const result = await pipeline.processSignal({
      shopperId: "shopper-1",
      signalType: "checkout_abandon",
      payload: { cartValue: 150 },
      sessionId: "sess-1",
      source: "web",
    });

    expect(result.signal.shopperId).toBe("shopper-1");
    expect(result.messagesGenerated).toBe(2); // sms + email
    expect(result.deliveries).toHaveLength(2);
    expect(result.deliveries.every((d) => d.success)).toBe(true);
    expect(result.rateLimited).toBe(false);

    // Verify stored
    const signals = await store.getAllSignals();
    expect(signals).toHaveLength(1);
    const messages = await store.getMessagesByCampaign("camp-1");
    expect(messages).toHaveLength(2);
  });

  it("returns empty results when no campaigns match", async () => {
    await store.addCampaign(makeCampaign({ triggerRules: [{ signalType: "purchase" }] }));

    const result = await pipeline.processSignal({
      shopperId: "shopper-1",
      signalType: "page_view",
      payload: {},
      sessionId: "sess-1",
      source: "web",
    });

    expect(result.messagesGenerated).toBe(0);
    expect(result.deliveries).toHaveLength(0);

    // Signal is still stored
    const signals = await store.getAllSignals();
    expect(signals).toHaveLength(1);
  });

  it("rate limits when shopper exceeds quota", async () => {
    const limitedStore = new MemoryStore();
    const signalService = new SignalIngestionService(silentLogger, limitedStore);
    const rateLimiter = new RateLimiterService({ maxPerWindow: 2 });
    const limitedPipeline = new PipelineService(
      signalService,
      new MessageGenerationService(silentLogger),
      new ChannelRegistry(silentLogger),
      limitedStore,
      rateLimiter,
      new AnalyticsService(),
      silentLogger
    );

    await limitedStore.addCampaign(
      makeCampaign({ channels: ["sms"] })
    );

    // First two should succeed
    const r1 = await limitedPipeline.processSignal({
      shopperId: "s1", signalType: "checkout_abandon",
      payload: {}, sessionId: "sess-1", source: "web",
    });
    const r2 = await limitedPipeline.processSignal({
      shopperId: "s1", signalType: "checkout_abandon",
      payload: {}, sessionId: "sess-2", source: "web",
    });
    expect(r1.messagesGenerated).toBe(1);
    expect(r2.messagesGenerated).toBe(1);

    // Third should be rate limited
    const r3 = await limitedPipeline.processSignal({
      shopperId: "s1", signalType: "checkout_abandon",
      payload: {}, sessionId: "sess-3", source: "web",
    });
    expect(r3.rateLimited).toBe(true);
    expect(r3.messagesGenerated).toBe(0);
  });

  it("tracks analytics correctly", async () => {
    await store.addCampaign(makeCampaign({}));

    await pipeline.processSignal({
      shopperId: "s1", signalType: "checkout_abandon",
      payload: {}, sessionId: "sess-1", source: "web",
    });

    const stats = analytics.getStats("camp-1");
    expect(stats.signalsReceived).toBe(1);
    expect(stats.messagesSent).toBe(2);
    expect(stats.deliverySuccessCount).toBe(2);
    expect(stats.deliveryFailureCount).toBe(0);
  });
});

describe("MemoryStore", () => {
  let store: MemoryStore;

  beforeEach(() => {
    store = new MemoryStore();
  });

  it("CRUD operations for campaigns", async () => {
    const campaign = makeCampaign({ id: "c1" });
    await store.addCampaign(campaign);

    expect(await store.getCampaign("c1")).toEqual(campaign);
    expect(await store.getAllCampaigns()).toHaveLength(1);

    const updated = await store.updateCampaign("c1", { name: "Updated" });
    expect(updated?.name).toBe("Updated");

    expect(await store.updateCampaign("nonexistent", { name: "x" })).toBeUndefined();
  });

  it("filters active campaigns", async () => {
    await store.addCampaign(makeCampaign({ id: "c1", status: "active" }));
    await store.addCampaign(makeCampaign({ id: "c2", status: "draft" }));
    await store.addCampaign(makeCampaign({ id: "c3", status: "active" }));

    const active = await store.getActiveCampaigns();
    expect(active).toHaveLength(2);
  });

  it("filters messages by campaign and shopper", async () => {
    await store.addMessage({
      id: "m1", campaignId: "c1", shopperId: "s1", channel: "sms",
      body: "hi", generatedAt: new Date().toISOString(), status: "sent", metadata: {},
    });
    await store.addMessage({
      id: "m2", campaignId: "c2", shopperId: "s1", channel: "email",
      body: "hi", generatedAt: new Date().toISOString(), status: "sent", metadata: {},
    });

    expect(await store.getMessagesByCampaign("c1")).toHaveLength(1);
    expect(await store.getMessagesByShopper("s1")).toHaveLength(2);
  });
});
