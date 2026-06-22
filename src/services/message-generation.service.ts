import { v4 as uuidv4 } from "uuid";
import type { Logger } from "pino";
import type { Message, MessageGenerationRequest } from "../domain/message.js";

export class MessageGenerationService {
  constructor(private readonly logger: Logger) {}

  async generate(request: MessageGenerationRequest): Promise<Message> {
    const startTime = Date.now();

    // Phase 2: call LLM API with campaign context, signal data, and tone guidelines
    const message: Message = {
      id: uuidv4(),
      campaignId: request.campaignId,
      shopperId: request.shopperId,
      channel: request.channel,
      body: `[Stub] AI-generated message for ${request.signalType} signal`,
      generatedAt: new Date().toISOString(),
      status: "generated",
      metadata: {
        aiModel: "stub",
        confidenceScore: 0,
        generationLatencyMs: Date.now() - startTime,
      },
    };

    this.logger.info(
      { messageId: message.id, channel: message.channel, campaign: message.campaignId },
      "Message generated"
    );

    return message;
  }
}
