import { useChat } from "../hooks/useChat";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";

/**
 * The chat widget shell. Owns chat state via useChat and composes the header,
 * message list, and input.
 */
export function ChatPanel() {
  const { messages, isSending, sendMessage } = useChat();

  return (
    <div className="chat-panel">
      <header className="chat-header">
        <div className="avatar">A</div>
        <div>
          <div className="chat-title">Aurora Goods</div>
          <div className="chat-subtitle">We typically reply instantly</div>
        </div>
      </header>

      <MessageList messages={messages} isSending={isSending} />

      <ChatInput onSend={sendMessage} disabled={isSending} />
    </div>
  );
}
