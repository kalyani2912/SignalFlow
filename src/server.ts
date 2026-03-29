import express from "express";
import pinoHttp from "pino-http";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { MemoryStore } from "./store/memory-store.js";
import { SignalIngestionService } from "./services/signal-ingestion.service.js";
import { MessageGenerationService } from "./services/message-generation.service.js";
import { ChannelRegistry } from "./channels/channel-registry.js";
import { PipelineService } from "./services/pipeline.service.js";
import { RateLimiterService } from "./services/rate-limiter.service.js";
import { AnalyticsService } from "./services/analytics.service.js";
import { requestIdMiddleware } from "./api/middleware/request-id.middleware.js";
import { apiKeyAuth } from "./api/middleware/auth.middleware.js";
import { errorMiddleware } from "./api/middleware/error.middleware.js";
import { createSignalRoutes } from "./api/routes/signals.routes.js";
import { createCampaignRoutes } from "./api/routes/campaigns.routes.js";
import { createMessageRoutes } from "./api/routes/messages.routes.js";

export function createApp() {
  const app = express();

  // Middleware
  app.use(express.json());
  app.use(requestIdMiddleware);
  app.use(
    pinoHttp({
      logger,
      customProps: (_req, res) => ({
        requestId: res.locals.requestId,
      }),
    })
  );

  // Services
  const store = new MemoryStore();
  const signalService = new SignalIngestionService(logger, store);
  const messageService = new MessageGenerationService(logger);
  const channelRegistry = new ChannelRegistry(logger);
  const rateLimiter = new RateLimiterService();
  const analytics = new AnalyticsService();
  const pipeline = new PipelineService(
    signalService,
    messageService,
    channelRegistry,
    store,
    rateLimiter,
    analytics,
    logger
  );

  logger.info(
    { channels: ["sms", "email", "whatsapp", "instagram_dm"] },
    "Services initialized"
  );

  // Auth
  app.use("/api/v1", apiKeyAuth);

  // Routes
  app.use("/api/v1/signals", createSignalRoutes(pipeline));
  app.use("/api/v1/campaigns", createCampaignRoutes(store, analytics));
  app.use("/api/v1/messages", createMessageRoutes(store));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", version: "0.1.0" });
  });

  // Error handling (must be last)
  app.use(errorMiddleware(logger));

  return { app, store, analytics };
}

// Start server when run directly
const { app } = createApp();

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, "SignalFlow server started");
});

function shutdown(signal: string) {
  logger.info({ signal }, "Shutting down gracefully");
  server.close(() => process.exit(0));
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
