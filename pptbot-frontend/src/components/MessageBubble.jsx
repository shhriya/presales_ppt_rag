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
      // Extract file_id from URL patterns like "/files/{file_id}?page={page_num}"
      try {
        const url = new URL(ref.url, window.location.origin);
        const pathParts = url.pathname.split('/');
        const fileIndex = pathParts.indexOf('files');
        if (fileIndex !== -1 && pathParts[fileIndex + 1]) {
          const fileId = pathParts[fileIndex + 1];
          onReferenceClick?.(fileId, ref.page);
        } else {
          // Fallback for other URL patterns
          const match = ref.url.match(/files\/([^\/\?]+)/);
          if (match && match[1]) {
            onReferenceClick?.(match[1], ref.page);
          } else {
            console.warn('Could not extract file_id from reference URL:', ref.url);
          }
        }
      } catch (error) {
        console.error('Error parsing reference URL:', ref.url, error);
      }
    }
  };

  return (
    <div className={`message-wrapper ${isUser ? "user" : "bot"}`}>
      <div className={`message ${isUser ? "user" : "bot"}`}>
        {content}
 
        {/* Show references only for bot messages */}
        {!isUser && references && references.length > 0 && (
          <div className="message-references">
            <div className="references-title">References:</div>
            {references.map((ref, idx) => (
              <span
                key={idx}
                className="reference-item"
                onClick={(e) => handleReferenceClick(e, ref)}
              >
                Page {ref.page}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}