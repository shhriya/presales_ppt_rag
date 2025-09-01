import React, { useEffect, useState } from "react";
import { listFiles, BASE_URL } from "../api/api";

export default function Decks() {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState("");

  async function loadFiles() {
    try {
      setError("");
      const res = await listFiles(); // ✅ fetch all sessions/files
      setFiles(res.files || res);    // handle both {files: []} or []
    } catch (e) {
      setError(e.message || "Failed to list files");
    }
  }

  useEffect(() => {
    loadFiles();
  }, []);

  // ✅ helper: detect ppt type
  function isPPT(file) {
    if (!file?.original_filename) return false;
    const lower = file.original_filename.toLowerCase();
    return lower.endsWith(".ppt") || lower.endsWith(".pptx");
  }

  // ✅ helper: get preview URL (PDF for PPTs, otherwise normal preview)
const getFilePreviewUrl = (f) => {
  if (f.original_filename.endsWith(".ppt") || f.original_filename.endsWith(".pptx")) {
    return `${BASE_URL}/convert-ppt-to-pdf/${f.session_id}/${f.original_filename}`;
  }
  return `${BASE_URL}${f.preview_url}`;
};

// const getFilePreviewUrl = (f) => {
//   if (isPPT(f)) {
//     // ✅ Only need filename now, backend searches sessions automatically
//     return `${BASE_URL}/convert-ppt-to-pdf/${f.original_filename}`;
//   }
//   return `${BASE_URL}${f.preview_url}`;
// };

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          marginBottom: 12,
          justifyContent: "center",
        }}
      >
        <h2 style={{ margin: 0 }}>Uploaded Files</h2>
        <button className="btn" onClick={loadFiles}>
          Refresh
        </button>
      </div>

      {error && (
        <div style={{ color: "#fca5a5", textAlign: "center" }}>{error}</div>
      )}

      {/* Centered list */}
      <div style={{ display: "flex", justifyContent: "center", marginTop: 32 }}>
        <div style={{ minWidth: 400, maxWidth: 600 }}>
          <div
            style={{
              marginBottom: 12,
              color: "#94a3b8",
              fontSize: 16,
              fontWeight: 500,
              textAlign: "center",
            }}
          >
            Uploaded Files
          </div>
          {files.length === 0 && (
            <div style={{ color: "#94a3b8", textAlign: "center" }}>
              No files yet.
            </div>
          )}
          <ul style={{ listStyle: "none", padding: 0 }}>
            {files.map((f) => (
              <li
                key={f.id || f.file_id}
                style={{
                  padding: "12px 0",
                  borderBottom: "1px solid #1f2937",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 16 }}>
                    {f.original_filename}
                  </div>
                  <div style={{ fontSize: 13, color: "#94a3b8" }}>
                    uploaded {f.uploaded_at?.split("T")[0]}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {f.preview_url && (
                    <button className="btn" onClick={() => setSelectedFile(f)}>
                      {isPPT(f) ? "Open PPT" : "Open"}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Full screen modal for file preview */}
      {selectedFile && (selectedFile.preview_url || isPPT(selectedFile)) && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(20, 20, 40, 0.95)",
            zIndex: 1000,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setSelectedFile(null)}
        >
          <div
            style={{
              width: "90vw",
              height: "90vh",
              background: "#fff",
              borderRadius: 12,
              boxShadow: "0 0 24px #0008",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <button
              style={{
                position: "absolute",
                top: 16,
                right: 24,
                zIndex: 10,
                background: "#334155",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                padding: "8px 16px",
                cursor: "pointer",
                fontSize: 18,
              }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedFile(null);
              }}
            >
              Close
            </button>
            <iframe
              src={getFilePreviewUrl(selectedFile)}
              width="100%"
              height="100%"
              style={{ border: "none", borderRadius: "12px", background: "#fff" }}
              title="file-preview"
            />
          </div>
        </div>
      )}
    </div>
  );
}