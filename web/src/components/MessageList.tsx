import { useEffect, useRef } from "react";
import type { ChatMessage } from "@spur-chat/shared";
import { MessageBubble } from "./MessageBubble";

/**
 * Scrollable message area. Auto-scrolls to the bottom whenever messages change
 * or the typing indicator toggles. Shows an empty-state greeting.
 */
export function MessageList({
  messages,
  isSending,
}: {
  messages: ChatMessage[];
  isSending: boolean;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  return (
    <div className="message-list">
      {messages.length === 0 && !isSending && (
        <div className="empty-state">
          <p>👋 Hi! I'm Aurora, your Aurora Goods assistant.</p>
          <p>Ask me about shipping, returns, payments, or store hours.</p>
        </div>
      )}

      {messages.map((m) => (
        <MessageBubble key={m.id} message={m} />
      ))}

      {isSending && (
        <div className="bubble-row from-ai">
          <div className="bubble typing">
            <span className="bubble-label">Aurora</span>
            <span className="typing-dots" aria-label="Aurora is typing">
              <span />
              <span />
              <span />
            </span>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
