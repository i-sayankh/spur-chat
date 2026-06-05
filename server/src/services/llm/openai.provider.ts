import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import type { ChatMessage } from "@spur-chat/shared";
import { env } from "../../config/env";
import { buildSystemPrompt } from "../../prompt/system-prompt";
import { LLMError, type LLMProvider } from "./llm.types";

/** Cap on response length — bounds cost and keeps replies support-sized. */
const MAX_TOKENS = 500;
/** Abort the call after this many ms so a hung request can't hang the user. */
const TIMEOUT_MS = 20_000;

/**
 * OpenAI implementation of LLMProvider. Encapsulates the entire OpenAI
 * dependency: prompt assembly, history mapping, timeout, and error
 * classification into a typed LLMError the controller can map to a friendly
 * message. Swapping providers means writing a sibling file — nothing else.
 */
export class OpenAIProvider implements LLMProvider {
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly systemPrompt: string;

  constructor() {
    this.client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    this.model = env.OPENAI_MODEL;
    this.systemPrompt = buildSystemPrompt();
  }

  async generateReply(
    history: ChatMessage[],
    userMessage: string
  ): Promise<string> {
    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: this.systemPrompt },
      ...history.map((m) => ({
        role: m.sender === "ai" ? ("assistant" as const) : ("user" as const),
        content: m.text,
      })),
      { role: "user", content: userMessage },
    ];

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const completion = await this.client.chat.completions.create(
        { model: this.model, messages, max_tokens: MAX_TOKENS },
        { signal: controller.signal }
      );

      const reply = completion.choices[0]?.message?.content?.trim();
      if (!reply) {
        throw new LLMError("network", "OpenAI returned an empty response.");
      }
      return reply;
    } catch (err) {
      throw this.toLLMError(err);
    } finally {
      clearTimeout(timeout);
    }
  }

  /** Classify SDK / network errors into our typed LLMError categories. */
  private toLLMError(err: unknown): LLMError {
    if (err instanceof LLMError) return err;

    if (err instanceof OpenAI.APIError) {
      if (err.status === 401) {
        return new LLMError("auth", "Invalid or missing OpenAI API key.", err);
      }
      if (err.status === 429) {
        return new LLMError("rate_limit", "OpenAI rate limit hit.", err);
      }
      return new LLMError("network", `OpenAI API error (${err.status}).`, err);
    }

    // AbortController fires an AbortError when our timeout elapses.
    if (err instanceof Error && err.name === "AbortError") {
      return new LLMError("timeout", "OpenAI request timed out.", err);
    }

    return new LLMError("network", "Network error calling OpenAI.", err);
  }
}
