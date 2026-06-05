/**
 * useChat — owns all chat state and side effects, keeping components dumb.
 *
 * On mount: read sessionId from localStorage; if present, rehydrate history
 * from the backend. On send: optimistically append the user bubble, POST, then
 * append the reply (or an error bubble) and persist the returned sessionId.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@spur-chat/shared";
import { api, ApiRequestError } from "../lib/api";

const SESSION_KEY = "spur-chat:sessionId";

/** Local-only id for optimistic bubbles before the server assigns a real one. */
let tempId = 0;
function nextTempId(): string {
  tempId += 1;
  return `temp-${tempId}`;
}

export interface UseChat {
  messages: ChatMessage[];
  isSending: boolean;
  error: string | null;
  sendMessage: (text: string) => Promise<void>;
}

export function useChat(): UseChat {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sessionIdRef = useRef<string | null>(null);
  // Mirrors isSending so the stable sendMessage callback can guard re-entry
  // without being recreated on every state change.
  const isSendingRef = useRef(false);
  useEffect(() => {
    isSendingRef.current = isSending;
  }, [isSending]);

  // Rehydrate an existing conversation on first load.
  useEffect(() => {
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) return;
    sessionIdRef.current = stored;

    api
      .getMessages(stored)
      .then((res) => setMessages(res.messages))
      .catch(() => {
        // Stale/invalid session — drop it and start fresh silently.
        localStorage.removeItem(SESSION_KEY);
        sessionIdRef.current = null;
      });
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isSendingRef.current) return;

    setError(null);
    setIsSending(true);

    const optimistic: ChatMessage = {
      id: nextTempId(),
      sender: "user",
      text: trimmed,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const res = await api.sendMessage({
        message: trimmed,
        sessionId: sessionIdRef.current ?? undefined,
      });

      sessionIdRef.current = res.sessionId;
      localStorage.setItem(SESSION_KEY, res.sessionId);

      const reply: ChatMessage = {
        id: nextTempId(),
        sender: "ai",
        text: res.reply,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, reply]);
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? err.message
          : "Something went wrong. Please try again.";
      setError(message);
      const errorBubble: ChatMessage = {
        id: nextTempId(),
        sender: "ai",
        text: message,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorBubble]);
    } finally {
      setIsSending(false);
    }
  }, []);

  return { messages, isSending, error, sendMessage };
}
