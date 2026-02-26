// MessageBubble.jsx
import React from "react";

export default function MessageBubble({
  role,
  content,
  references,
  onReferenceClick
}) {
  const isUser = role === "user";

  const handleReferenceClick = (e, ref) => {
    e.preventDefault();
    const fileId = ref.file_id || null;
    const page = ref.page || 1;

    if (fileId) {
      onReferenceClick?.(fileId, page);
    } else if (ref.url) {
      try {
        const match = ref.url.match(/files\/([^\/\?]+)/);
        if (match && match[1] && match[1] !== 'placeholder') {
          onReferenceClick?.(match[1], page);
        }
      } catch (error) { }
    }
  };

  const getRefLabel = (ref) => {
    if (ref.label) return `${ref.label} ${ref.page}`;
    if (ref.filetype && ['pptx', 'ppt'].includes(ref.filetype.toLowerCase())) {
      return `Slide ${ref.page}`;
    }
    return `Page ${ref.page}`;
  };

  return (
    <div className={`message-wrapper ${isUser ? "user" : "bot"}`}>
      <div className="message-container" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start',
        maxWidth: '85%'
      }}>
        <div className={`message ${isUser ? "user" : "bot"}`} style={{ maxWidth: '100%', marginBottom: references?.length > 0 ? '4px' : '0' }}>
          <div className="message-content">{content}</div>
        </div>

        {!isUser && references && references.length > 0 && (
          <div className="message-footer-external">
            <div className="references-section">
              <div className="references-header">
                <i className="bi bi-link-45deg"></i>
                <span>Sources</span>
              </div>
              <div className="references-container">
                {references.map((ref, idx) => (
                  <button
                    key={idx}
                    className="reference-pill"
                    onClick={(e) => handleReferenceClick(e, ref)}
                  >
                    {getRefLabel(ref)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}