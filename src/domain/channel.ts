import type { Message } from "./message.js";

export type ChannelType = "sms" | "email" | "whatsapp" | "instagram_dm";

export interface ChannelConfig {
  type: ChannelType;
  enabled: boolean;
  rateLimit: number;
}

export interface DeliveryResult {
  success: boolean;
  channelMessageId?: string;
  error?: string;
  deliveredAt?: string;
}

export interface ChannelAdapter {
  send(message: Message): Promise<DeliveryResult>;
  validateConfig(): Promise<boolean>;
}
