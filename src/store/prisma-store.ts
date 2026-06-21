import { PrismaNeonHttp } from "@prisma/adapter-neon";
import { PrismaClient } from "../generated/prisma/client.js";
import type { Signal } from "../domain/signal.js";
import type { Campaign } from "../domain/campaign.js";
import type { Message } from "../domain/message.js";
import type { MessageMetadata } from "../domain/message.js";
import type { ChannelType } from "../domain/channel.js";
import type { SignalType } from "../domain/signal.js";
import type { CampaignStatus } from "../domain/campaign.js";
import type { TriggerRule } from "../domain/campaign.js";
import type { MessageStatus } from "../domain/message.js";
import type { IStore } from "./store.interface.js";

function createPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required for PrismaStore");
  const adapter = new PrismaNeonHttp(databaseUrl, { fullResults: true });
  return new PrismaClient({ adapter } as any);
}

export class PrismaStore implements IStore {
  public readonly prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma ?? createPrismaClient();
  }

  // --- Signals ---

  async addSignal(signal: Signal): Promise<Signal> {
    const row = await this.prisma.signal.create({
      data: {
        id: signal.id,
        shopperId: signal.shopperId,
        signalType: signal.signalType,
        payload: signal.payload as any,
        sessionId: signal.sessionId,
        timestamp: signal.timestamp,
        source: signal.source,
      },
    });
    return this.toSignal(row);
  }

  async getSignal(id: string): Promise<Signal | undefined> {
    const row = await this.prisma.signal.findUnique({ where: { id } });
    return row ? this.toSignal(row) : undefined;
  }

  async getAllSignals(): Promise<Signal[]> {
    const rows = await this.prisma.signal.findMany({ orderBy: { createdAt: "desc" } });
    return rows.map((r) => this.toSignal(r));
  }

  async getSignalsByShopper(shopperId: string): Promise<Signal[]> {
    const rows = await this.prisma.signal.findMany({
      where: { shopperId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => this.toSignal(r));
  }

  private toSignal(row: any): Signal {
    return {
      id: row.id,
      shopperId: row.shopperId,
      signalType: row.signalType as SignalType,
      payload: (row.payload ?? {}) as Record<string, unknown>,
      sessionId: row.sessionId,
      timestamp: row.timestamp,
      source: row.source,
    };
  }

  // --- Campaigns ---

  async addCampaign(campaign: Campaign): Promise<Campaign> {
    const row = await this.prisma.campaign.create({
      data: {
        id: campaign.id,
        name: campaign.name,
        brandId: campaign.brandId,
        status: campaign.status,
        channels: campaign.channels as any,
        triggerRules: campaign.triggerRules as any,
        messageTemplate: campaign.messageTemplate ?? null,
        toneGuidelines: campaign.toneGuidelines ?? null,
        createdAt: campaign.createdAt,
        updatedAt: campaign.updatedAt,
      },
    });
    return this.toCampaign(row);
  }

  async getCampaign(id: string): Promise<Campaign | undefined> {
    const row = await this.prisma.campaign.findUnique({ where: { id } });
    return row ? this.toCampaign(row) : undefined;
  }

  async getAllCampaigns(): Promise<Campaign[]> {
    const rows = await this.prisma.campaign.findMany();
    return rows.map((r) => this.toCampaign(r));
  }

  async getActiveCampaigns(): Promise<Campaign[]> {
    const rows = await this.prisma.campaign.findMany({ where: { status: "active" } });
    return rows.map((r) => this.toCampaign(r));
  }

  async updateCampaign(
    id: string,
    updates: Partial<Campaign>
  ): Promise<Campaign | undefined> {
    const existing = await this.prisma.campaign.findUnique({ where: { id } });
    if (!existing) return undefined;

    const data: any = { updatedAt: new Date().toISOString() };
    if (updates.name !== undefined) data.name = updates.name;
    if (updates.brandId !== undefined) data.brandId = updates.brandId;
    if (updates.status !== undefined) data.status = updates.status;
    if (updates.channels !== undefined) data.channels = updates.channels as any;
    if (updates.triggerRules !== undefined) data.triggerRules = updates.triggerRules as any;
    if (updates.messageTemplate !== undefined) data.messageTemplate = updates.messageTemplate;
    if (updates.toneGuidelines !== undefined) data.toneGuidelines = updates.toneGuidelines;

    const row = await this.prisma.campaign.update({ where: { id }, data });
    return this.toCampaign(row);
  }

  private toCampaign(row: any): Campaign {
    return {
      id: row.id,
      name: row.name,
      brandId: row.brandId,
      status: row.status as CampaignStatus,
      channels: (row.channels ?? []) as ChannelType[],
      triggerRules: (row.triggerRules ?? []) as TriggerRule[],
      messageTemplate: row.messageTemplate ?? undefined,
      toneGuidelines: row.toneGuidelines ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  // --- Messages ---

  async addMessage(message: Message): Promise<Message> {
    const row = await this.prisma.message.create({
      data: {
        id: message.id,
        campaignId: message.campaignId,
        shopperId: message.shopperId,
        channel: message.channel,
        subject: message.subject ?? null,
        body: message.body,
        generatedAt: message.generatedAt,
        status: message.status,
        metadata: message.metadata as any,
      },
    });
    return this.toMessage(row);
  }

  async getMessage(id: string): Promise<Message | undefined> {
    const row = await this.prisma.message.findUnique({ where: { id } });
    return row ? this.toMessage(row) : undefined;
  }

  async getMessagesByCampaign(campaignId: string): Promise<Message[]> {
    const rows = await this.prisma.message.findMany({
      where: { campaignId },
      orderBy: { generatedAt: "desc" },
    });
    return rows.map((r) => this.toMessage(r));
  }

  async getMessagesByShopper(shopperId: string): Promise<Message[]> {
    const rows = await this.prisma.message.findMany({
      where: { shopperId },
      orderBy: { generatedAt: "desc" },
    });
    return rows.map((r) => this.toMessage(r));
  }

  async updateMessage(
    id: string,
    updates: Partial<Message>
  ): Promise<Message | undefined> {
    const existing = await this.prisma.message.findUnique({ where: { id } });
    if (!existing) return undefined;

    const data: any = {};
    if (updates.status !== undefined) data.status = updates.status;
    if (updates.subject !== undefined) data.subject = updates.subject;
    if (updates.body !== undefined) data.body = updates.body;
    if (updates.metadata !== undefined) data.metadata = updates.metadata as any;

    const row = await this.prisma.message.update({ where: { id }, data });
    return this.toMessage(row);
  }

  private toMessage(row: any): Message {
    return {
      id: row.id,
      campaignId: row.campaignId,
      shopperId: row.shopperId,
      channel: row.channel as ChannelType,
      subject: row.subject ?? undefined,
      body: row.body,
      generatedAt: row.generatedAt,
      status: row.status as MessageStatus,
      metadata: (row.metadata ?? {}) as MessageMetadata,
    };
  }
}
