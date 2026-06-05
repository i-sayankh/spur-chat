import { env } from "../../config/env";
import type { LLMProvider } from "./llm.types";
import { StubProvider } from "./stub.provider";

/**
 * Factory: pick the LLM provider from env. This is the one place that knows
 * which concrete implementation is in use — callers depend only on LLMProvider.
 *
 * The real OpenAI provider is wired in here in the next build step; for now the
 * stub keeps the whole request path runnable without a key.
 */
export function createLLMProvider(): LLMProvider {
  switch (env.LLM_PROVIDER) {
    case "stub":
      return new StubProvider();
    default:
      return new StubProvider();
  }
}

export type { LLMProvider } from "./llm.types";
