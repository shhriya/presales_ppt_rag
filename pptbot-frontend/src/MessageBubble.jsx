// MessageBubble.jsx
import React, { useEffect, useState } from "react";
 
export default function MessageBubble({ role, content }) {
  const isUser = role === "user";
  const [displayedText, setDisplayedText] = useState("");
 
  useEffect(() => {
  setDisplayedText("");
  let i = 0;

  const interval = setInterval(() => {
    i++;
    setDisplayedText(content.slice(0, i));
    if (i >= content.length) {
      clearInterval(interval);
    }
  }, 50);

  return () => clearInterval(interval);
}, [content]);

 
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
          maxWidth: "75%",
          padding: "10px 14px",
          borderRadius: "14px",
          background: isUser ? "#2563eb" : "#111827",
          color: "white",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {displayedText}
      </div>
    </div>
  );
}