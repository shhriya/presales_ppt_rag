import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { BASE_URL } from "../api/api";
 
export default function FileViewer() {
  const { fileId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1); // <-- page number
  const [error, setError] = useState("");
  const [isNewTab, setIsNewTab] = useState(false);

  useEffect(() => {
    // Detect if opened in new tab vs within app
    const checkContext = () => {
      // If no referrer or referrer is external, likely new tab
      const referrer = document.referrer;
      const isExternalReferrer = !referrer || !referrer.includes(window.location.hostname);

      // If window.opener exists, it was opened by another window (likely new tab)
      const hasOpener = !!window.opener;

      // If history length is 1, likely new tab or direct access
      const shortHistory = window.history.length <= 1;

      setIsNewTab(isExternalReferrer || hasOpener || shortHistory);
    };

    checkContext();

    // extract page number from query param
    const query = new URLSearchParams(location.search);
    const p = parseInt(query.get("page")) || 1;
    setPage(p);

    async function init() {
      try {
        // Build a preview URL using the correct backend endpoint for session files
        let previewUrl = `${BASE_URL}/files/${fileId}`;
 
        // For PDF, we can append #page=N
        const ext = fileId.split(".").pop()?.toLowerCase();
        setType(ext || "");
 
        if (ext === "pdf") {
          previewUrl += `#page=${p}`;
        } else if (ext === "pptx" || ext === "ppt" || ext === "docx" || ext === "doc") {
          // Office docs are converted to PDF, page parameter will be handled by PDF viewer
          previewUrl = `${BASE_URL}/files/${fileId}/as-pdf#page=${p}`;
        }
 
        setUrl(previewUrl);
      } catch (e) {
        setError("Failed to load file");
      }
    }
    init();
  }, [fileId, location.search]);
 
  const isImage = ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "tiff", "ico", "heic", "heif"].includes(type);
  const isPdf = type === "pdf";
  const isPptx = type === "pptx" || type === "ppt";
  const isDoc = type === "docx" || type === "doc";
  const isTextLike = ["txt", "csv", "md", "log", "rtf", "xml", "json", "js", "py", "html", "css", "scss", "less", "yaml", "yml"].includes(type);
  const isAudio = ["mp3", "wav", "ogg", "m4a", "flac", "aac", "wma"].includes(type);
  const isVideo = ["mp4", "mov", "webm", "avi", "mkv", "wmv", "flv", "ogv"].includes(type);
  const isOffice = isPptx || isDoc;
 
  return (
    <div style={{ padding: 16 }}>
      {/* Only show back button when used within the app, not in new tab */}
      {!isNewTab && (
        <button className="btn" onClick={() => navigate(-1)} style={{ marginBottom: 12 }}>
          ← Back
        </button>
      )}
      {error && <div style={{ color: "#fca5a5" }}>{error}</div>}

      {isImage && <img src={url} alt="preview" style={{ maxWidth: "100%" }} onError={() => setError("Failed to load image")} />}

      {/* PDF files and Office docs converted to PDF */}
      {(isPdf || isOffice) && (
        <iframe
          title="document"
          src={url}
          style={{ width: "100%", height: "80vh", border: 0 }}
          onError={() => setError("Failed to load document")}
        />
      )}

      {/* Text-like files */}
      {isTextLike && (
        <iframe
          title="text"
          src={url}
          style={{ width: "100%", height: "80vh", border: 0 }}
          onError={() => setError("Failed to load text file")}
        />
      )}

      {/* Audio files */}
      {isAudio && (
        <audio controls src={url} style={{ width: "100%" }} onError={() => setError("Failed to load audio file")}>
          Your browser does not support the audio element.
        </audio>
      )}

      {/* Video files */}
      {isVideo && (
        <video controls src={url} style={{ width: "100%", maxHeight: "80vh" }} onError={() => setError("Failed to load video file")}>
          Your browser does not support the video element.
        </video>
      )}

      {/* Fallback for unsupported file types */}
      {!isImage && !isPdf && !isOffice && !isTextLike && !isAudio && !isVideo && !error && (
        <div style={{ color: "#94a3b8", textAlign: "center", padding: "40px" }}>
          <p>Preview not available for this file type.</p>
          <p>File type: {type || "unknown"}</p>
          <p>File ID: {fileId}</p>
          <p>You can download from Groups or try opening the file directly.</p>
        </div>
      )}
    </div>
  );
}
 