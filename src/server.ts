import express from "express";
import pinoHttp from "pino-http";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { SignalIngestionService } from "./services/signal-ingestion.service.js";
import { MessageGenerationService } from "./services/message-generation.service.js";
import { ChannelRegistry } from "./channels/channel-registry.js";
import { createSignalRoutes } from "./api/routes/signals.routes.js";

const app = express();

// Middleware
app.use(express.json());
app.use(pinoHttp({ logger }));

// Services
const signalService = new SignalIngestionService(logger);
const messageService = new MessageGenerationService(logger);
const channelRegistry = new ChannelRegistry(logger);

logger.info(
  { channels: ["sms", "email", "whatsapp", "instagram_dm"] },
  "Services initialized"
);

// Suppress unused variable warnings — these services are wired in Phase 2
void messageService;
void channelRegistry;

// Routes
app.use("/api/v1/signals", createSignalRoutes(signalService));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", version: "0.1.0" });
});

// Graceful shutdown
const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, "SignalFlow server started");
});

function shutdown(signal: string) {
  logger.info({ signal }, "Shutting down gracefully");
  server.close(() => process.exit(0));
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
