import { v4 as uuidv4 } from "uuid";
import type { Logger } from "pino";
import type { Signal, SignalIngestionPayload } from "../domain/signal.js";
import type { Campaign } from "../domain/campaign.js";
import type { MemoryStore } from "../store/memory-store.js";

export class SignalIngestionService {
  constructor(
    private readonly logger: Logger,
    private readonly store: MemoryStore
  ) {}

  async ingest(payload: SignalIngestionPayload): Promise<Signal> {
    const signal: Signal = {
      id: uuidv4(),
      shopperId: payload.shopperId,
      signalType: payload.signalType,
      payload: payload.payload,
      sessionId: payload.sessionId,
      source: payload.source,
      timestamp: new Date().toISOString(),
    };

    this.logger.info(
      { signalId: signal.id, type: signal.signalType, shopper: signal.shopperId },
      "Signal ingested"
    );

    return signal;
  }

  async matchCampaigns(signal: Signal): Promise<Campaign[]> {
    const activeCampaigns = await this.store.getActiveCampaigns();

    return activeCampaigns.filter((campaign) =>
      campaign.triggerRules.some((rule) => {
        if (rule.signalType !== signal.signalType) return false;
        if (!rule.conditions) return true;
        return Object.entries(rule.conditions).every(
          ([key, value]) => signal.payload[key] === value
        );
      })
    );
  }
}
