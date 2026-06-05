/**
 * Chat service — the channel-agnostic core. It knows nothing about HTTP,
 * Express, or which channel (live-chat / WhatsApp / IG) the message came from.
 * Adding a channel later means a new route reusing this exact service.
 */
import type { ChatMessage, ChatResponse } from "@spur-chat/shared";
import { conversationRepo } from "../repositories/conversation.repo";
import { createLLMProvider, type LLMProvider } from "./llm";

/** Max characters accepted from a single message; longer input is truncated. */
export const MAX_MESSAGE_CHARS = 4000;
/** How many recent messages are sent to the LLM as context (cost/token bound). */
export const HISTORY_LIMIT = 10;

export class ChatService {
  constructor(private readonly llm: LLMProvider = createLLMProvider()) {}

  /**
   * Orchestrates a single chat turn:
   * resolve session → load prior history → persist user msg →
   * generate reply → persist reply → return { reply, sessionId }.
   */
  async sendMessage(
    rawMessage: string,
    sessionId?: string
  ): Promise<ChatResponse> {
    const message = this.normalize(rawMessage);

    // Resolve the session. A stale/unknown id never errors — we start fresh.
    const conversationId = await this.resolveConversation(sessionId);

    // Prior context BEFORE persisting the new user message, so the provider
    // receives history + userMessage without duplicating the current turn.
    const history = await conversationRepo.getRecentMessages(
      conversationId,
      HISTORY_LIMIT
    );

    await conversationRepo.addMessage(conversationId, "user", message);

    const reply = await this.llm.generateReply(history, message);

    await conversationRepo.addMessage(conversationId, "ai", reply);

    return { reply, sessionId: conversationId };
  }

  /** Full conversation history for rehydrating the UI on load. */
  async getHistory(sessionId: string): Promise<ChatMessage[]> {
    return conversationRepo.getMessages(sessionId);
  }

  private normalize(message: string): string {
    const trimmed = message.trim();
    return trimmed.length > MAX_MESSAGE_CHARS
      ? trimmed.slice(0, MAX_MESSAGE_CHARS)
      : trimmed;
  }

  private async resolveConversation(sessionId?: string): Promise<string> {
    if (sessionId && (await conversationRepo.exists(sessionId))) {
      return sessionId;
    }
    return conversationRepo.create({ channel: "live-chat" });
  }
}

export const chatService = new ChatService();
