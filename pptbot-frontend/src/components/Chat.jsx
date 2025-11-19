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
      <div className="chat-list" ref={listRef} style={{
        flex: 1,
        overflowY: 'auto',
        padding: '8px 0',
        display: 'flex',
        flexDirection: 'column'
      }}>
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
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            margin: '8px',
            position: 'relative',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 12px',
              backgroundColor: '#f8f9fa',
              borderBottom: '1px solid #e2e8f0',
              borderTopLeftRadius: '8px',
              borderTopRightRadius: '8px'
            }}>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 500, color: '#374151' }}>File Preview</h3>
              <button 
                onClick={() => onReferenceClick(null)}
                style={{
                  backgroundColor: '#0a225e',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '13px',
                  transition: 'background-color 0.2s',
                  ':hover': {
                    backgroundColor: '#1d4ed8'
                  }
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ marginRight: '4px' }}>
                  <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="currentColor"/>
                </svg>
                Back to Chat
              </button>
            </div>
            <FilePreviewModal 
              fileId={currentFileId}
              onClose={() => onReferenceClick(null)}
            />
          </div>
        )}
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
      <div className="chat-input" style={{ padding: 6 }}>
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
          style={{ flex: 1, minWidth: 0 }}
        />

        <button type="button" onClick={handleSend} disabled={disabled}>
          Send
        </button>
      </div>
    </div>
  );
}