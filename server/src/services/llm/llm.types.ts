import type { ChatMessage } from "@spur-chat/shared";

/**
 * The seam for the LLM. Swapping providers (OpenAI → Claude → …) means writing
 * one new file implementing this interface and wiring it in the factory.
 */
export interface LLMProvider {
  generateReply(history: ChatMessage[], userMessage: string): Promise<string>;
}

/** Categories of LLM failure the controller maps to friendly messages. */
export type LLMErrorKind =
  | "auth" // missing/invalid API key
  | "rate_limit" // 429
  | "timeout" // request exceeded our deadline
  | "network"; // generic network / 5xx

export class LLMError extends Error {
  constructor(
    public readonly kind: LLMErrorKind,
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "LLMError";
  }
}
