import type { Logger } from "pino";
import type { ChannelType, ChannelAdapter, DeliveryResult } from "../domain/channel.js";
import type { Message } from "../domain/message.js";

class StubAdapter implements ChannelAdapter {
  constructor(
    private readonly channelType: ChannelType,
    private readonly logger: Logger
  ) {}

  async send(message: Message): Promise<DeliveryResult> {
    this.logger.info(
      { channel: this.channelType, messageId: message.id, shopperId: message.shopperId },
      `[Stub] Delivered via ${this.channelType}`
    );
    return {
      success: true,
      channelMessageId: `stub-${this.channelType}-${Date.now()}`,
      deliveredAt: new Date().toISOString(),
    };
  }

  async validateConfig(): Promise<boolean> {
    return true;
  }
}

export class ChannelRegistry {
  private adapters = new Map<ChannelType, ChannelAdapter>();

  constructor(private readonly logger: Logger) {
    this.register("sms", new StubAdapter("sms", logger));
    this.register("email", new StubAdapter("email", logger));
    this.register("whatsapp", new StubAdapter("whatsapp", logger));
    this.register("instagram_dm", new StubAdapter("instagram_dm", logger));
  }

  register(type: ChannelType, adapter: ChannelAdapter): void {
    this.adapters.set(type, adapter);
    this.logger.debug({ channel: type }, "Channel adapter registered");
  }

  getAdapter(type: ChannelType): ChannelAdapter {
    const adapter = this.adapters.get(type);
    if (!adapter) {
      throw new Error(`No adapter registered for channel: ${type}`);
    }
    return adapter;
  }

  async deliver(message: Message): Promise<DeliveryResult> {
    const adapter = this.getAdapter(message.channel);
    return adapter.send(message);
  }
}
