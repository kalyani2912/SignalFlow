import type { Logger } from "pino";
import type { SignalIngestionPayload } from "../domain/signal.js";
import type { DeliveryResult } from "../domain/channel.js";
import type { Signal } from "../domain/signal.js";
import type { MemoryStore } from "../store/memory-store.js";
import type { SignalIngestionService } from "./signal-ingestion.service.js";
import type { MessageGenerationService } from "./message-generation.service.js";
import type { ChannelRegistry } from "../channels/channel-registry.js";

export interface PipelineResult {
  signal: Signal;
  messagesGenerated: number;
  deliveries: DeliveryResult[];
}

export class PipelineService {
  constructor(
    private readonly signalService: SignalIngestionService,
    private readonly messageService: MessageGenerationService,
    private readonly channelRegistry: ChannelRegistry,
    private readonly store: MemoryStore,
    private readonly logger: Logger
  ) {}

  async processSignal(payload: SignalIngestionPayload): Promise<PipelineResult> {
    const start = Date.now();

    const signal = await this.signalService.ingest(payload);
    await this.store.addSignal(signal);

    const campaigns = await this.signalService.matchCampaigns(signal);
    const deliveries: DeliveryResult[] = [];
    let messagesGenerated = 0;

    for (const campaign of campaigns) {
      for (const channel of campaign.channels) {
        const message = await this.messageService.generate({
          signalId: signal.id,
          signalType: signal.signalType,
          shopperId: signal.shopperId,
          channel,
          campaignId: campaign.id,
          toneGuidelines: campaign.toneGuidelines,
          templatePrompt: campaign.messageTemplate,
        });

        await this.store.addMessage(message);
        messagesGenerated++;

        const result = await this.channelRegistry.deliver(message);
        deliveries.push(result);

        const newStatus = result.success ? "sent" as const : "failed" as const;
        await this.store.updateMessage(message.id, { status: newStatus });
      }
    }

    this.logger.info(
      {
        signalId: signal.id,
        campaignsMatched: campaigns.length,
        messagesGenerated,
        deliveries: deliveries.length,
        durationMs: Date.now() - start,
      },
      "Pipeline completed"
    );

    return { signal, messagesGenerated, deliveries };
  }
}
