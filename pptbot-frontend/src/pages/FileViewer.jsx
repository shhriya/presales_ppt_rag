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
 
  useEffect(() => {
    // extract page number from query param
    const query = new URLSearchParams(location.search);
    const p = parseInt(query.get("page")) || 1;
    setPage(p);
 
    async function init() {
      try {
        // Build a preview URL
        let previewUrl = `${BASE_URL}/files/${fileId}`;
 
        // For PDF, we can append #page=N
        const ext = fileId.split(".").pop()?.toLowerCase();
        setType(ext || "");
 
        if (ext === "pdf") {
          previewUrl += `#page=${p}`;
        } else if (ext === "pptx" || ext === "ppt" || ext === "docx" || ext === "doc") {
          // Convert to PDF and jump to page
          previewUrl = `${BASE_URL}/files/${fileId}/as-pdf#page=${p}`;
        }
 
        setUrl(previewUrl);
      } catch (e) {
        setError("Failed to load file");
      }
    }
    init();
  }, [fileId, location.search]);
 
  const isImage = ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(type);
  const isPdf = type === "pdf";
  const isPptx = type === "pptx" || type === "ppt";
  const isDoc = type === "docx" || type === "doc";
  const isTextLike = ["txt", "csv", "md", "log"].includes(type);
 
  return (
    <div style={{ padding: 16 }}>
      <button className="btn" onClick={() => navigate(-1)} style={{ marginBottom: 12 }}>
        ← Back
      </button>
      {error && <div style={{ color: "#fca5a5" }}>{error}</div>}
 
      {isImage && <img src={url} alt="preview" style={{ maxWidth: "100%" }} />}
 
      {(isPdf || isPptx || isDoc) && (
        <iframe title="document" src={url} style={{ width: "100%", height: "80vh", border: 0 }} />
      )}
 
      {isTextLike && <iframe title="text" src={url} style={{ width: "100%", height: "80vh", border: 0 }} />}
 
      {/* Basic audio/video preview */}
      {(["mp3","wav","ogg","m4a"].includes(type)) && <audio controls src={url} style={{ width: "100%" }} />}
      {(["mp4","mov","webm","avi","mkv"].includes(type)) && <video controls src={url} style={{ width: "100%", maxHeight: "80vh" }} />}
 
      {!isImage && !isPdf && !isPptx && !isDoc && !isTextLike && !["mp3","wav","ogg","m4a","mp4","mov","webm","avi","mkv"].includes(type) && (
        <div style={{ color: "#94a3b8" }}>
          Preview not available for this file type. You can download from Groups.
        </div>
      )}
    </div>
  );
}
 