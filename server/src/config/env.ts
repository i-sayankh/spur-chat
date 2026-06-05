/**
 * Environment configuration, validated with zod at boot.
 *
 * Fail fast: if a required variable is missing or malformed the process exits
 * with a readable message instead of crashing later mid-request.
 */
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),
  PORT: z.coerce.number().int().positive().default(8080),
  CORS_ORIGIN: z.string().default("*"),
  // Seam for swapping the LLM backend. "stub" is handy for local dev / tests.
  LLM_PROVIDER: z.enum(["openai", "stub"]).default("openai"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  console.error(`Invalid environment configuration:\n${issues}`);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
