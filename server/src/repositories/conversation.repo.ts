/**
 * Conversation repository — the ONLY place that touches Prisma for chat data.
 *
 * It also owns the mapping between Prisma's `Sender` enum (USER | AI) and the
 * lowercase wire form ("user" | "ai") from the shared contract, so the rest of
 * the app speaks one vocabulary.
 */
import type { ChatMessage, Sender } from "@spur-chat/shared";
import { Prisma, Sender as PrismaSender } from "@prisma/client";
import { prisma } from "./prisma";

function toWireSender(sender: PrismaSender): Sender {
  return sender === PrismaSender.AI ? "ai" : "user";
}

function toPrismaSender(sender: Sender): PrismaSender {
  return sender === "ai" ? PrismaSender.AI : PrismaSender.USER;
}

function toChatMessage(row: {
  id: string;
  sender: PrismaSender;
  text: string;
  createdAt: Date;
}): ChatMessage {
  return {
    id: row.id,
    sender: toWireSender(row.sender),
    text: row.text,
    createdAt: row.createdAt.toISOString(),
  };
}

export const conversationRepo = {
  /** Create a fresh conversation, optionally tagging channel metadata. */
  async create(metadata?: Prisma.InputJsonValue): Promise<string> {
    const conversation = await prisma.conversation.create({
      data: { metadata: metadata ?? undefined },
    });
    return conversation.id;
  },

  /** Whether a conversation id still exists (guards against stale sessionIds). */
  async exists(conversationId: string): Promise<boolean> {
    const found = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true },
    });
    return found !== null;
  },

  /** Append one message and return it in wire form. */
  async addMessage(
    conversationId: string,
    sender: Sender,
    text: string
  ): Promise<ChatMessage> {
    const row = await prisma.message.create({
      data: { conversationId, sender: toPrismaSender(sender), text },
    });
    return toChatMessage(row);
  },

  /** Full history for a conversation, oldest first. */
  async getMessages(conversationId: string): Promise<ChatMessage[]> {
    const rows = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
    });
    return rows.map(toChatMessage);
  },

  /** Last N messages, returned oldest-first (for the LLM context window). */
  async getRecentMessages(
    conversationId: string,
    limit: number
  ): Promise<ChatMessage[]> {
    const rows = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.reverse().map(toChatMessage);
  },
};

export type ConversationRepo = typeof conversationRepo;
