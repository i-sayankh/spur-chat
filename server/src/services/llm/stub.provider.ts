import type { ChatMessage } from "@spur-chat/shared";
import type { LLMProvider } from "./llm.types";

/**
 * A deterministic, no-network provider for local dev and tests. Echoes the
 * user's message so the full persistence + request path can be exercised
 * without an OpenAI key. Selected via LLM_PROVIDER=stub.
 */
export class StubProvider implements LLMProvider {
  async generateReply(
    history: ChatMessage[],
    userMessage: string
  ): Promise<string> {
    const turns = history.length;
    return `(stub reply) You said: "${userMessage}". I have ${turns} earlier message(s) in context.`;
  }
}
