import type { Signal } from "../domain/signal.js";
import type { Campaign } from "../domain/campaign.js";
import type { Message } from "../domain/message.js";
import type { IStore } from "./store.interface.js";

export class MemoryStore implements IStore {
  private signals = new Map<string, Signal>();
  private campaigns = new Map<string, Campaign>();
  private messages = new Map<string, Message>();

  // Signals
  async addSignal(signal: Signal): Promise<Signal> {
    this.signals.set(signal.id, signal);
    return signal;
  }

  async getSignal(id: string): Promise<Signal | undefined> {
    return this.signals.get(id);
  }

  async getAllSignals(): Promise<Signal[]> {
    return Array.from(this.signals.values());
  }

  async getSignalsByShopper(shopperId: string): Promise<Signal[]> {
    return Array.from(this.signals.values()).filter(
      (s) => s.shopperId === shopperId
    );
  }

  // Campaigns
  async addCampaign(campaign: Campaign): Promise<Campaign> {
    this.campaigns.set(campaign.id, campaign);
    return campaign;
  }

  async getCampaign(id: string): Promise<Campaign | undefined> {
    return this.campaigns.get(id);
  }

  async getAllCampaigns(): Promise<Campaign[]> {
    return Array.from(this.campaigns.values());
  }

  async getActiveCampaigns(): Promise<Campaign[]> {
    return Array.from(this.campaigns.values()).filter(
      (c) => c.status === "active"
    );
  }

  async updateCampaign(
    id: string,
    updates: Partial<Campaign>
  ): Promise<Campaign | undefined> {
    const existing = this.campaigns.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    this.campaigns.set(id, updated);
    return updated;
  }

  // Messages
  async addMessage(message: Message): Promise<Message> {
    this.messages.set(message.id, message);
    return message;
  }

  async getMessage(id: string): Promise<Message | undefined> {
    return this.messages.get(id);
  }

  async getMessagesByCampaign(campaignId: string): Promise<Message[]> {
    return Array.from(this.messages.values()).filter(
      (m) => m.campaignId === campaignId
    );
  }

  async getMessagesByShopper(shopperId: string): Promise<Message[]> {
    return Array.from(this.messages.values()).filter(
      (m) => m.shopperId === shopperId
    );
  }

  async updateMessage(
    id: string,
    updates: Partial<Message>
  ): Promise<Message | undefined> {
    const existing = this.messages.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };
    this.messages.set(id, updated);
    return updated;
  }
}
