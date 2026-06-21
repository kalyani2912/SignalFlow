import type { Signal } from "../domain/signal.js";
import type { Campaign } from "../domain/campaign.js";
import type { Message } from "../domain/message.js";

export interface IStore {
  // Signals
  addSignal(signal: Signal): Promise<Signal>;
  getSignal(id: string): Promise<Signal | undefined>;
  getAllSignals(): Promise<Signal[]>;
  getSignalsByShopper(shopperId: string): Promise<Signal[]>;

  // Campaigns
  addCampaign(campaign: Campaign): Promise<Campaign>;
  getCampaign(id: string): Promise<Campaign | undefined>;
  getAllCampaigns(): Promise<Campaign[]>;
  getActiveCampaigns(): Promise<Campaign[]>;
  updateCampaign(id: string, updates: Partial<Campaign>): Promise<Campaign | undefined>;

  // Messages
  addMessage(message: Message): Promise<Message>;
  getMessage(id: string): Promise<Message | undefined>;
  getMessagesByCampaign(campaignId: string): Promise<Message[]>;
  getMessagesByShopper(shopperId: string): Promise<Message[]>;
  updateMessage(id: string, updates: Partial<Message>): Promise<Message | undefined>;
}
