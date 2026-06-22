import { describe, it, expect, beforeEach } from "vitest";
import pino from "pino";
import { SignalIngestionService } from "../signal-ingestion.service.js";
import { MemoryStore } from "../../store/memory-store.js";
import type { Campaign } from "../../domain/campaign.js";

const silentLogger = pino({ level: "silent" });

describe("SignalIngestionService", () => {
  let store: MemoryStore;
  let service: SignalIngestionService;

  beforeEach(() => {
    store = new MemoryStore();
    service = new SignalIngestionService(silentLogger, store);
  });

  describe("ingest", () => {
    it("creates a signal with correct fields", async () => {
      const payload = {
        shopperId: "shopper-1",
        signalType: "checkout_abandon" as const,
        payload: { cartValue: 99.99 },
        sessionId: "sess-abc",
        source: "web",
      };

      const signal = await service.ingest(payload);

      expect(signal.id).toBeDefined();
      expect(signal.shopperId).toBe("shopper-1");
      expect(signal.signalType).toBe("checkout_abandon");
      expect(signal.payload).toEqual({ cartValue: 99.99 });
      expect(signal.sessionId).toBe("sess-abc");
      expect(signal.source).toBe("web");
      expect(signal.timestamp).toBeDefined();
    });
  });

  describe("matchCampaigns", () => {
    const makeCampaign = (overrides: Partial<Campaign>): Campaign => ({
      id: "camp-1",
      name: "Test Campaign",
      brandId: "brand-1",
      status: "active",
      channels: ["sms"],
      triggerRules: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides,
    });

    it("returns campaigns whose trigger rules match the signal type", async () => {
      await store.addCampaign(
        makeCampaign({
          id: "camp-abandon",
          triggerRules: [{ signalType: "checkout_abandon" }],
        })
      );
      await store.addCampaign(
        makeCampaign({
          id: "camp-purchase",
          triggerRules: [{ signalType: "purchase" }],
        })
      );

      const signal = await service.ingest({
        shopperId: "s1",
        signalType: "checkout_abandon",
        payload: {},
        sessionId: "sess-1",
        source: "web",
      });

      const matched = await service.matchCampaigns(signal);
      expect(matched).toHaveLength(1);
      expect(matched[0].id).toBe("camp-abandon");
    });

    it("filters by conditions in the payload", async () => {
      await store.addCampaign(
        makeCampaign({
          id: "camp-shoes",
          triggerRules: [
            { signalType: "add_to_cart", conditions: { category: "shoes" } },
          ],
        })
      );

      const shoeSignal = await service.ingest({
        shopperId: "s1",
        signalType: "add_to_cart",
        payload: { category: "shoes" },
        sessionId: "sess-1",
        source: "web",
      });
      expect(await service.matchCampaigns(shoeSignal)).toHaveLength(1);

      const hatSignal = await service.ingest({
        shopperId: "s1",
        signalType: "add_to_cart",
        payload: { category: "hats" },
        sessionId: "sess-2",
        source: "web",
      });
      expect(await service.matchCampaigns(hatSignal)).toHaveLength(0);
    });

    it("ignores non-active campaigns", async () => {
      await store.addCampaign(
        makeCampaign({
          id: "camp-draft",
          status: "draft",
          triggerRules: [{ signalType: "page_view" }],
        })
      );

      const signal = await service.ingest({
        shopperId: "s1",
        signalType: "page_view",
        payload: {},
        sessionId: "sess-1",
        source: "web",
      });

      expect(await service.matchCampaigns(signal)).toHaveLength(0);
    });
  });
});
