import type { NextFunction, Request, Response } from "express";
import { LLMError } from "../services/llm/llm.types";

/**
 * Helper to forward errors from async route handlers to Express's error
 * pipeline. Without this, a rejected promise in an async handler is unhandled.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

const FRIENDLY_LLM_MESSAGE =
  "Sorry, I'm having trouble responding right now. Please try again in a moment.";

/**
 * Central error handler. Catches everything, logs the real error server-side,
 * and returns structured `{ error }` JSON — the client never sees a stack
 * trace or secret, and the process stays alive.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Express needs the 4-arg shape
  _next: NextFunction
) {
  if (err instanceof LLMError) {
    console.error(`[LLMError:${err.kind}]`, err.message, err.cause ?? "");
    return res.status(502).json({ error: FRIENDLY_LLM_MESSAGE });
  }

  console.error("[UnhandledError]", err);
  return res.status(500).json({ error: "Something went wrong. Please try again." });
}
