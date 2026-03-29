import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(3000),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),

  // Channel credentials (Phase 2)
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  SENDGRID_API_KEY: z.string().optional(),
  WHATSAPP_API_TOKEN: z.string().optional(),
  INSTAGRAM_API_TOKEN: z.string().optional(),

  // Authentication
  API_KEYS: z.string().optional(),

  // AI provider (Phase 2)
  OPENAI_API_KEY: z.string().optional(),
});

export const env = Object.freeze(envSchema.parse(process.env));
