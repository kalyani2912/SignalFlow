import { v4 as uuidv4 } from "uuid";
import type { Logger } from "pino";
import type { Signal, SignalIngestionPayload } from "../domain/signal.js";
import type { Campaign } from "../domain/campaign.js";

export class SignalIngestionService {
  constructor(private readonly logger: Logger) {}

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

    const campaigns = await this.matchCampaigns(signal);
    if (campaigns.length > 0) {
      this.logger.info(
        { signalId: signal.id, matchedCampaigns: campaigns.length },
        "Campaigns matched"
      );
    }

    return signal;
  }

  async matchCampaigns(_signal: Signal): Promise<Campaign[]> {
    // Phase 2: evaluate signal against active campaign trigger rules
    return [];
  }
}
