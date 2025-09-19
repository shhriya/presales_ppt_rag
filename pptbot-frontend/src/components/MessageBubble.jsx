// MessageBubble.jsx
import React from "react";
 
export default function MessageBubble({ role, content }) {
  const isUser = role === "user";

  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start" }}>
      <div
        className={`message ${isUser ? "user" : "bot"}`}
        style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", marginBottom: 12 }}
      >
        {content}
      </div>
    </div>
  );
}