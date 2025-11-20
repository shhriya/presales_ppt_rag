// // chat.jsx
import { useEffect, useRef, useState } from "react";
import MessageBubble from "./MessageBubble";
import FilePreviewModal from "./FilePreviewModal";

export default function Chat({ messages, disabled, onSend, isAsking, currentFileId, onReferenceClick }) {
  const [input, setInput] = useState("");
  const listRef = useRef(null);
  const textRef = useRef(null);

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
    if (textRef.current) {
      textRef.current.style.height = "auto";
    }
  }

  useEffect(() => {
  const list = listRef.current;
  if (list) {
    list.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
  }
}, [messages]);


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
            <MessageBubble 
              key={i} 
              role={m.role} 
              content={m.content} 
              references={m.references} 
              currentFileId={currentFileId}
              onReferenceClick={onReferenceClick}
            />
          ))
        }
        {currentFileId && (
          <FilePreviewModal 
            fileId={currentFileId}
            onClose={() => onReferenceClick(null)}
          />
        )}
        {isAsking && (
          <div className="typing-indicator">
            <span>Assistant is typing</span>
            <div className="typing-dots">
              <span className="typing-dot"></span>
              <span className="typing-dot"></span>
              <span className="typing-dot"></span>
            </div>
          </div>
        )}
      </div>

      {/* input fixed at bottom */}
      <div className="chat-input">
        <textarea
          id="chat-input"
          name="chatInput"
          ref={textRef}
          rows={1}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            if (textRef.current) {
              textRef.current.style.height = "auto";
              textRef.current.style.height = Math.min(textRef.current.scrollHeight, 140) + "px";
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder="Ask about your presentation..."
          disabled={disabled}
          style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', resize: 'none' }}
        />

        <button type="button" onClick={handleSend} disabled={disabled}>
          Send
        </button>
      </div>
    </div>
  );
}