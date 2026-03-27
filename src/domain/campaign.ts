import type { ChannelType } from "./channel.js";
import type { SignalType } from "./signal.js";

export type CampaignStatus = "draft" | "active" | "paused" | "archived";

export interface TriggerRule {
  signalType: SignalType;
  conditions?: Record<string, unknown>;
}

export interface Campaign {
  id: string;
  name: string;
  brandId: string;
  status: CampaignStatus;
  channels: ChannelType[];
  triggerRules: TriggerRule[];
  messageTemplate?: string;
  toneGuidelines?: string;
  createdAt: string;
  updatedAt: string;
}
