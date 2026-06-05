import { useState, type KeyboardEvent } from "react";

/**
 * Textarea + send button. Enter sends, Shift+Enter inserts a newline. Send is
 * disabled while a request is in flight or the input is empty.
 */
export function ChatInput({
  onSend,
  disabled,
}: {
  onSend: (text: string) => void;
  disabled: boolean;
}) {
  const [value, setValue] = useState("");
  const canSend = value.trim().length > 0 && !disabled;

  function submit() {
    if (!canSend) return;
    onSend(value);
    setValue("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="chat-input">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type your message…"
        rows={1}
        aria-label="Message"
      />
      <button onClick={submit} disabled={!canSend} aria-label="Send message">
        Send
      </button>
    </div>
  );
}
