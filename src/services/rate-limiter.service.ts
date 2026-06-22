export class RateLimiterService {
  private windows = new Map<string, number[]>();
  private maxMessages: number;
  private windowMs: number;

  constructor(opts?: { maxPerWindow?: number; windowMs?: number }) {
    this.maxMessages = opts?.maxPerWindow ?? 5;
    this.windowMs = opts?.windowMs ?? 3_600_000; // 1 hour
  }

  canSend(shopperId: string): boolean {
    this.prune(shopperId);
    const timestamps = this.windows.get(shopperId);
    return !timestamps || timestamps.length < this.maxMessages;
  }

  record(shopperId: string): void {
    if (!this.windows.has(shopperId)) {
      this.windows.set(shopperId, []);
    }
    this.windows.get(shopperId)!.push(Date.now());
  }

  getRemainingQuota(shopperId: string): number {
    this.prune(shopperId);
    const timestamps = this.windows.get(shopperId);
    return this.maxMessages - (timestamps?.length ?? 0);
  }

  private prune(shopperId: string): void {
    const timestamps = this.windows.get(shopperId);
    if (!timestamps) return;
    const cutoff = Date.now() - this.windowMs;
    const pruned = timestamps.filter((t) => t > cutoff);
    if (pruned.length === 0) {
      this.windows.delete(shopperId);
    } else {
      this.windows.set(shopperId, pruned);
    }
  }
}
