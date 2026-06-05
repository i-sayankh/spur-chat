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

  // Body-parser errors (malformed JSON, payload too large) arrive as
  // http-errors with a 4xx status. Surface a clean message, not a 500.
  const status = httpErrorStatus(err);
  if (status === 400) {
    return res.status(400).json({ error: "Invalid request body." });
  }
  if (status === 413) {
    return res.status(413).json({ error: "Message is too large." });
  }

  console.error("[UnhandledError]", err);
  return res.status(500).json({ error: "Something went wrong. Please try again." });
}

/** Extract a 4xx status from a thrown body-parser / http-errors object. */
function httpErrorStatus(err: unknown): number | undefined {
  if (typeof err === "object" && err !== null) {
    const status = (err as { status?: number; statusCode?: number }).status ??
      (err as { statusCode?: number }).statusCode;
    if (typeof status === "number" && status >= 400 && status < 500) {
      return status;
    }
  }
  return undefined;
}
