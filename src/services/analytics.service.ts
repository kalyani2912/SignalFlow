export interface CampaignStats {
  campaignId: string;
  signalsReceived: number;
  messagesSent: number;
  deliverySuccessCount: number;
  deliveryFailureCount: number;
}

export class AnalyticsService {
  private stats = new Map<string, CampaignStats>();

  private ensure(campaignId: string): CampaignStats {
    let entry = this.stats.get(campaignId);
    if (!entry) {
      entry = {
        campaignId,
        signalsReceived: 0,
        messagesSent: 0,
        deliverySuccessCount: 0,
        deliveryFailureCount: 0,
      };
      this.stats.set(campaignId, entry);
    }
    return entry;
  }

  recordSignal(campaignId: string): void {
    this.ensure(campaignId).signalsReceived++;
  }

  recordMessageSent(campaignId: string): void {
    this.ensure(campaignId).messagesSent++;
  }

  recordDeliverySuccess(campaignId: string): void {
    this.ensure(campaignId).deliverySuccessCount++;
  }

  recordDeliveryFailure(campaignId: string): void {
    this.ensure(campaignId).deliveryFailureCount++;
  }

  getStats(campaignId: string): CampaignStats {
    return { ...this.ensure(campaignId) };
  }

  getAllStats(): CampaignStats[] {
    return Array.from(this.stats.values()).map((s) => ({ ...s }));
  }
}
