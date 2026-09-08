import { NextFunction, Request, Response } from "express";
import { errorMessage, logger } from "../utils/logger";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error("Unhandled error", err);
  res.status(500).json({
    error: errorMessage(err) || "Internal server error",
  });
}
