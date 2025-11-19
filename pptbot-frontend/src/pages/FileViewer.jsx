import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { BASE_URL } from "../api/api";

export default function FileViewer() {
  const { fileId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isNewTab, setIsNewTab] = useState(false);

  useEffect(() => {
    // Detect if opened in new tab vs within app
    const checkContext = () => {
      const referrer = document.referrer;
      const isExternalReferrer = !referrer || !referrer.includes(window.location.hostname);
      const hasOpener = !!window.opener;
      const shortHistory = window.history.length <= 1;
      setIsNewTab(isExternalReferrer || hasOpener || shortHistory);
    };

    checkContext();

    // Extract page number from query param
    const query = new URLSearchParams(location.search);
    const p = parseInt(query.get("page")) || 1;
    setPage(p);

    async function init() {
      if (!fileId) {
        setError("No file ID provided");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError("");
        
        // Get file extension
        const ext = fileId.split(".").pop()?.toLowerCase() || "";
        setType(ext);

        // Build the appropriate URL based on file type
        let previewUrl = `${BASE_URL}/files/${fileId}`;
        
        if (ext === "pdf") {
          // For PDFs, we can use the built-in browser PDF viewer
          previewUrl += `#page=${p}`;
        } else if (["pptx", "ppt", "docx", "doc"].includes(ext)) {
          // Convert Office docs to PDF for consistent viewing
          previewUrl = `${BASE_URL}/files/${fileId}/as-pdf#page=${p}`;
        }
        
        setUrl(previewUrl);
      } catch (e) {
        console.error("Error loading file:", e);
        setError("Failed to load file. Please try again or download the file directly.");
      } finally {
        setIsLoading(false);
      }
    }
    
    init();
  }, [fileId, location.search]);

  const handleDownload = () => {
    if (!fileId) return;
    window.open(`${BASE_URL}/files/${fileId}/download`, '_blank');
  };

  const handleBack = () => {
    navigate(-1);
  };

  // File type detection
  const isImage = ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "tiff", "ico", "heic", "heif"].includes(type);
  const isPdf = type === "pdf";
  const isOffice = ["pptx", "ppt", "docx", "doc"].includes(type);
  const isTextLike = ["txt", "csv", "md", "log", "rtf", "xml", "json", "js", "py", "html", "css", "scss", "less", "yaml", "yml"].includes(type);
  const isAudio = ["mp3", "wav", "ogg", "m4a", "flac", "aac", "wma"].includes(type);
  const isVideo = ["mp4", "mov", "webm", "avi", "mkv", "wmv", "flv", "ogv"].includes(type);
  const showIframe = isPdf || isOffice || isTextLike;
  
  // If we're in a new tab, add some basic styling
  const containerStyle = isNewTab ? {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: '#fff',
    zIndex: 1000,
    padding: '20px',
    overflow: 'auto'
  } : {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden'
  };

  return (
    <div style={containerStyle}>
      {/* Header with back button and download */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
        paddingBottom: '12px',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <button 
          onClick={handleBack}
          style={{
            background: '#f3f4f6',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            padding: '8px 16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            color: '#374151'
          }}
        >
          ← Back to Chat
        </button>
        
        <button 
          onClick={handleDownload}
          style={{
            background: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '8px 16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 16L7 11L8.41 9.58L11 12.17V4H13V12.17L15.59 9.58L17 11L12 16Z" fill="currentColor"/>
            <path d="M20 18H4V20H20V18Z" fill="currentColor"/>
          </svg>
          Download
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div style={{
          padding: '16px',
          backgroundColor: '#fef2f2',
          color: '#b91c1c',
          borderRadius: '6px',
          marginBottom: '16px',
          borderLeft: '4px solid #dc2626'
        }}>
          {error}
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '60vh',
          color: '#6b7280',
          fontSize: '16px'
        }}>
          Loading file preview...
        </div>
      )}

      {/* File preview content */}
      {!isLoading && !error && (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          overflow: 'hidden',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb'
        }}>
          {/* Image preview */}
          {isImage && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '20px',
              backgroundColor: '#fff',
              flex: 1,
              overflow: 'auto'
            }}>
              <img 
                src={url} 
                alt="File preview" 
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: '100%',
                  objectFit: 'contain',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                }} 
                onError={() => setError("Failed to load image")} 
              />
            </div>
          )}

          {/* PDF and document preview */}
          {showIframe && (
            <iframe
              title="document-preview"
              src={url}
              style={{
                width: '100%',
                flex: 1,
                border: 'none',
                backgroundColor: '#fff'
              }}
              onError={() => setError("Failed to load document")}
            />
          )}

          {/* Audio preview */}
          {isAudio && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '40px 20px',
              backgroundColor: '#fff',
              flex: 1
            }}>
              <audio 
                controls 
                src={url} 
                style={{ 
                  width: '100%',
                  maxWidth: '600px'
                }}
                onError={() => setError("Failed to load audio file")}
              >
                Your browser does not support the audio element.
              </audio>
            </div>
          )}

          {/* Video preview */}
          {isVideo && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '20px',
              backgroundColor: '#000',
              flex: 1,
              overflow: 'auto'
            }}>
              <video 
                controls 
                src={url} 
                style={{ 
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain'
                }}
                onError={() => setError("Failed to load video file")}
              >
                Your browser does not support the video element.
              </video>
            </div>
          )}

          {/* Unsupported file type */}
          {!isImage && !showIframe && !isAudio && !isVideo && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '60px 20px',
              textAlign: 'center',
              color: '#6b7280',
              flex: 1
            }}>
              <div style={{
                fontSize: '48px',
                marginBottom: '16px',
                color: '#d1d5db'
              }}>
                📄
              </div>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#1f2937',
                marginBottom: '8px'
              }}>
                Preview not available
              </h3>
              <p style={{
                marginBottom: '16px',
                maxWidth: '400px',
                lineHeight: '1.5'
              }}>
                This file type cannot be previewed in the browser. You can download the file to view it.
              </p>
              <p style={{
                fontSize: '14px',
                color: '#9ca3af'
              }}>
                File type: {type || 'unknown'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
 