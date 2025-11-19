// MessageBubble.jsx
import React from "react";
 
export default function MessageBubble({ 
  role, 
  content, 
  references, 
  onReferenceClick // New prop for handling reference clicks
}) {
  const isUser = role === "user";
 
  const handleReferenceClick = (e, ref) => {
    e.preventDefault();
    if (ref.file_id) {
      // If we have a file_id, use it to show the preview
      onReferenceClick?.(ref.file_id, ref.page);
    } else if (ref.url) {
      // Fallback to URL if no file_id is available
      window.open(ref.url, '_blank');
    }
  };

  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start" }}>
      <div
        className={`message ${isUser ? "user" : "bot"}`}
        style={{
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          marginBottom: 12,
          maxWidth: "80%",
          lineHeight: 1.5,
        }}
      >
        {content}
 
        {/* Show references only for bot messages */}
        {!isUser && references && references.length > 0 && (
          <div style={{ marginTop: 8, fontSize: 13, color: "#0a225e" }}>
            <b>References:</b>
            {references.map((ref, idx) => (
              <div key={idx}>
                <span 
                  onClick={(e) => handleReferenceClick(e, ref)}
                  style={{
                    color: "#2563eb",
                    textDecoration: "underline",
                    marginLeft: 4,
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'inline-block'
                  }}
                >
                  Page {ref.page}
                </span>
                : {ref.accuracy}% accuracy
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}