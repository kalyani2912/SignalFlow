import type { ChannelType } from "./channel.js";
import type { SignalType } from "./signal.js";

export type MessageStatus =
  | "pending"
  | "generated"
  | "approved"
  | "sent"
  | "delivered"
  | "failed";

export interface MessageMetadata {
  aiModel?: string;
  confidenceScore?: number;
  generationLatencyMs?: number;
}

export interface Message {
  id: string;
  campaignId: string;
  shopperId: string;
  channel: ChannelType;
  subject?: string;
  body: string;
  generatedAt: string;
  status: MessageStatus;
  metadata: MessageMetadata;
}

export interface MessageGenerationRequest {
  signalId: string;
  signalType: SignalType;
  shopperId: string;
  channel: ChannelType;
  campaignId: string;
  toneGuidelines?: string;
  templatePrompt?: string;
}
