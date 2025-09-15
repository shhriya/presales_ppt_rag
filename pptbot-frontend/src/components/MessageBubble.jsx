// MessageBubble.jsx
import React from "react";
 
export default function MessageBubble({ role, content }) {
  const isUser = role === "user";

  return (
    <div
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        marginBottom: "12px",
      }}
    >
      <div
        style={{
          maxWidth: "min(75%, 800px)",
          padding: "10px 14px",
          borderRadius: "14px",
          background: isUser ? "#2563eb" : "#111827",
          color: "white",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {content}
      </div>
    </div>
  );
}