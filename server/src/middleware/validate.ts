import type { NextFunction, Request, Response } from "express";
import { ZodError, type ZodSchema } from "zod";

/**
 * Express middleware that validates `req.body` against a zod schema and replaces
 * it with the parsed result. On failure it responds 400 with a user-safe
 * message — boundaries never trust raw request input.
 */
export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const message = firstMessage(result.error);
      return res.status(400).json({ error: message });
    }
    req.body = result.data;
    next();
  };
}

function firstMessage(error: ZodError): string {
  return error.issues[0]?.message ?? "Invalid request.";
}
