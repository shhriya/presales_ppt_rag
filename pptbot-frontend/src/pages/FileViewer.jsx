import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { BASE_URL } from "../api/api";

export default function FileViewer() {
  const { fileId } = useParams();
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [type, setType] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function init() {
      try {
        // Build a preview URL that streams content
        const previewUrl = `${BASE_URL}/files/${fileId}`;
        setUrl(previewUrl);
        // Guess simple type from extension
        const ext = fileId.split(".").pop()?.toLowerCase();
        setType(ext || "");
      } catch (e) {
        setError("Failed to load file");
      }
    }
    init();
  }, [fileId]);

  const isImage = ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(type);
  const isPdf = type === "pdf";
  const isPptx = type === "pptx" || type === "ppt";
  const isTextLike = ["txt"].includes(type);

  return (
    <div style={{ padding: 16 }}>
      <button className="btn" onClick={() => navigate(-1)} style={{ marginBottom: 12 }}>
        ← Back
      </button>
      {error && <div style={{ color: "#fca5a5" }}>{error}</div>}

      {isImage && (
        <img src={url} alt="preview" style={{ maxWidth: "100%" }} />
      )}

      {isPdf && (
        <iframe title="pdf" src={url} style={{ width: "100%", height: "80vh", border: 0 }} />
      )}

      {isPptx && (
        <iframe title="pptx" src={`${BASE_URL}/files/${fileId}/as-pdf`} style={{ width: "100%", height: "80vh", border: 0 }} />
      )}

      {isTextLike && (
        <iframe title="text" src={url} style={{ width: "100%", height: "80vh", border: 0 }} />
      )}

      {!isImage && !isPdf && !isPptx && !isTextLike && (
        <div style={{ color: "#94a3b8" }}>
          Preview not available for this file type. You can download from Groups.
        </div>
      )}
    </div>
  );
}


