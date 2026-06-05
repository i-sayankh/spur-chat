/**
 * Chat controller — the only layer that speaks HTTP for the chat channel.
 * It validates/extracts request data, delegates to the channel-agnostic
 * chat.service, and shapes the response. No business logic lives here.
 */
import type { Request, Response } from "express";
import { z } from "zod";
import type {
  ChatResponse,
  MessagesResponse,
} from "@spur-chat/shared";
import { chatService } from "../services/chat.service";

export const chatMessageSchema = z.object({
  message: z
    .string({ required_error: "Message cannot be empty." })
    .trim()
    .min(1, "Message cannot be empty."),
  sessionId: z.string().min(1).optional(),
});

export const chatController = {
  /** POST /chat/message */
  async postMessage(req: Request, res: Response) {
    const { message, sessionId } = req.body as z.infer<typeof chatMessageSchema>;
    const result: ChatResponse = await chatService.sendMessage(
      message,
      sessionId
    );
    res.status(200).json(result);
  },

  /** GET /chat/:sessionId/messages */
  async getMessages(req: Request, res: Response) {
    const { sessionId } = req.params;
    const messages = await chatService.getHistory(sessionId);
    const body: MessagesResponse = { messages };
    res.status(200).json(body);
  },
};
