// MessageBubble.jsx
import React from "react";
 
export default function MessageBubble({ role, content, references }) {
  const isUser = role === "user";
 
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
                {ref.url ? (
                  <a
                    href={ref.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: "#2563eb",
                      textDecoration: "underline",
                      marginLeft: 4,
                      fontWeight: 500,
                    }}
                    onClick={(e) => {
                      // Prevent default for internal routes to avoid opening in new tab
                      if (ref.url.startsWith('/')) {
                        e.preventDefault();
                        window.open(ref.url, '_blank');
                      }
                    }}
                  >
                    Page {ref.page}
                  </a>
                ) : (
                  <>Page {ref.page}</>
                )}
                : {ref.accuracy}% accuracy
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}