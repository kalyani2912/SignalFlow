import type { Request, Response, NextFunction } from "express";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";

export function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  // Allow SSE stream and static dashboard without API key
  if (req.method === "GET" && req.path === "/signals/stream") {
    next();
    return;
  }

  const apiKeys = env.API_KEYS;

  if (!apiKeys) {
    if (env.NODE_ENV === "development") {
      logger.warn("API key auth disabled — no API_KEYS configured");
      next();
      return;
    }
    res.status(500).json({ error: "Server misconfiguration: no API keys set" });
    return;
  }

  const validKeys = apiKeys.split(",").map((k) => k.trim());
  const provided =
    req.headers["x-api-key"] as string | undefined ??
    (req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.slice(7)
      : undefined);

  if (!provided) {
    res.status(401).json({ error: "API key required" });
    return;
  }

  if (!validKeys.includes(provided)) {
    res.status(403).json({ error: "Invalid API key" });
    return;
  }

  next();
}
