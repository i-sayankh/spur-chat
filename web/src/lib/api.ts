/**
 * Typed fetch wrapper around the backend. Uses the SAME shared DTO types the
 * server validates, so the client can't drift from the contract. Throws on
 * non-2xx with the server's user-safe `error` message for the UI to surface.
 */
import type {
  ApiError,
  ChatRequest,
  ChatResponse,
  MessagesResponse,
} from "@spur-chat/shared";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export class ApiRequestError extends Error {}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...init,
    });
  } catch {
    // Network-level failure (server down, CORS, offline).
    throw new ApiRequestError(
      "Can't reach the server. Please check your connection and try again."
    );
  }

  const data = (await res.json().catch(() => null)) as unknown;

  if (!res.ok) {
    const message =
      (data as ApiError | null)?.error ?? "Something went wrong. Please try again.";
    throw new ApiRequestError(message);
  }

  return data as T;
}

export const api = {
  sendMessage(body: ChatRequest): Promise<ChatResponse> {
    return request<ChatResponse>("/chat/message", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  getMessages(sessionId: string): Promise<MessagesResponse> {
    return request<MessagesResponse>(
      `/chat/${encodeURIComponent(sessionId)}/messages`
    );
  },
};
