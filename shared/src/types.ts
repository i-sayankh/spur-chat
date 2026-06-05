/**
 * Shared DTO contract imported by BOTH the server and the web client.
 *
 * Keeping these types in one workspace package means the two sides cannot
 * drift: the frontend renders the exact shape the backend validates and
 * returns. The server maps its Prisma `Sender` enum (USER | AI) to the
 * lowercase wire form ("user" | "ai") defined here at the boundary.
 */

export type Sender = "user" | "ai";

export interface ChatMessage {
  id: string;
  sender: Sender;
  text: string;
  /** ISO 8601 timestamp string over the wire. */
  createdAt: string;
}

export interface ChatRequest {
  message: string;
  sessionId?: string;
}

export interface ChatResponse {
  reply: string;
  sessionId: string;
}

export interface MessagesResponse {
  messages: ChatMessage[];
}

export interface ApiError {
  /** User-safe message; never a stack trace or secret. */
  error: string;
}
