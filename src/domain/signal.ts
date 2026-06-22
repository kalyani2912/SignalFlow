import { z } from "zod";

export const SignalType = z.enum([
  "page_view",
  "add_to_cart",
  "checkout_start",
  "checkout_abandon",
  "purchase",
  "product_view",
  "search",
  "custom",
]);
export type SignalType = z.infer<typeof SignalType>;

export interface Signal {
  id: string;
  shopperId: string;
  signalType: SignalType;
  payload: Record<string, unknown>;
  sessionId: string;
  timestamp: string;
  source: string;
}

export const SignalIngestionPayload = z.object({
  shopperId: z.string().min(1),
  signalType: SignalType,
  payload: z.record(z.unknown()).default({}),
  sessionId: z.string().min(1),
  source: z.string().min(1),
});
export type SignalIngestionPayload = z.infer<typeof SignalIngestionPayload>;
