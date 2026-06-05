import type { ChatMessage } from "@spur-chat/shared";

/**
 * A single chat bubble. User messages sit right (accent); Aurora's sit left
 * (neutral) with a small label.
 */
export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.sender === "user";
  return (
    <div className={`bubble-row ${isUser ? "from-user" : "from-ai"}`}>
      <div className="bubble">
        {!isUser && <span className="bubble-label">Aurora</span>}
        <span className="bubble-text">{message.text}</span>
      </div>
    </div>
  );
}
