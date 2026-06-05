import { env } from "../../config/env";
import type { LLMProvider } from "./llm.types";
import { OpenAIProvider } from "./openai.provider";
import { StubProvider } from "./stub.provider";

/**
 * Factory: pick the LLM provider from env. This is the one place that knows
 * which concrete implementation is in use — callers depend only on LLMProvider.
 * Adding Claude later = a new ClaudeProvider file + a case here.
 */
export function createLLMProvider(): LLMProvider {
  switch (env.LLM_PROVIDER) {
    case "stub":
      return new StubProvider();
    case "openai":
    default:
      return new OpenAIProvider();
  }
}

export type { LLMProvider } from "./llm.types";
