import type { Request, Response, NextFunction, RequestHandler } from "express";
import { ZodError } from "zod";
import type { Logger } from "pino";

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function errorMiddleware(logger: Logger) {
  return (err: Error, req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.issues });
      return;
    }

    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }

    logger.error({ err, path: req.path, method: req.method }, "Unhandled error");
    res.status(500).json({ error: "Internal server error" });
  };
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
