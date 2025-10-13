// // chat.jsx
import { useEffect, useRef, useState } from "react";
import MessageBubble from "./MessageBubble";
 
export default function Chat({ messages, disabled, onSend, isAsking }) {
  const [input, setInput] = useState("");
  const listRef = useRef(null);
 
  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);
 
  function handleSend() {
    const val = input.trim();
    if (!val) return;
    console.log("Submitting value:", val);
    onSend(val);
    setInput(""); // clear
  }
 
  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault(); // stop form from submitting early
      handleSend();
    }
  }
 
  return (
    <div className="chat-container">
      {/* scrollable chat area */}
      <div className="chat-list" ref={listRef}>
        {messages.map((m, i) => (
          <MessageBubble key={i} role={m.role} content={m.content} references={m.references} />
        ))}
        {isAsking && (
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              color: "#94a3b8",
              padding: "8px 4px",
            }}
          >
            <span>Assistant is typing</span>
            <span className="dots" style={{ display: "inline-flex", gap: 4 }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 6,
                  background: "#94a3b8",
                  opacity: 0.6,
                  animation: "blink 1.2s infinite 0s",
                }}
              />
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 6,
                  background: "#94a3b8",
                  opacity: 0.6,
                  animation: "blink 1.2s infinite 0.2s",
                }}
              />
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 6,
                  background: "#94a3b8",
                  opacity: 0.6,
                  animation: "blink 1.2s infinite 0.4s",
                }}
              />
            </span>
          </div>
        )}
      </div>
 
      {/* input fixed at bottom */}
      <div className="chat-input">
        <input
          id="chat-input"
          name="chatInput"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about your presentation..."
          disabled={disabled}
          style={{ flex: 1, minWidth: 0 }}
        />
 
        <button type="button" onClick={handleSend} disabled={disabled}>
          Send
        </button>
      </div>
    </div>
  );
}
 