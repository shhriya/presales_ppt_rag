import React, { useEffect, useState } from "react";
import { listFiles } from "../api/api";
import { useNavigate } from "react-router-dom";
import "./Chunks.css"; // 👈 add a css file for scroll styling

export default function Chunks() {
  const [files, setFiles] = useState([]);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    async function loadFiles() {
      try {
        setError("");
        const res = await listFiles();
        setFiles(res.files || res || []);
      } catch (e) {
        setError(e.message || "Failed to list files");
      }
    }
    loadFiles();
  }, []);

  const handleViewChunks = (sessionId) => {
    if (!sessionId) return alert("No session available for this file");
    navigate(`/chunks/${sessionId}`);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        
        height: "100vh",
        padding: "20px",
        boxSizing: "border-box",
      }}
    >
      <h2>Select a file to view chunks</h2>
      {error && (
        <div style={{ color: "#fca5a5", textAlign: "center" }}>{error}</div>
      )}

      {/* Scrollable area */}
      <div
        className="scroll-container" // 👈 attach custom scrollbar class
        style={{
          flex: 1,
          width: "100%",
          maxWidth: 600,
          overflowY: "auto",
          // background: "#0f172a",
          padding: "10px",
          borderRadius: "8px",
          marginTop: "10px",
        }}
      >
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {files.map((f) => (
  <li
    key={f.id}
    style={{
      marginBottom: 16,
      padding: 12,
      background: "#1e293b",
      borderRadius: 8,
      color: "#fff",
      cursor: "pointer",
      transition: "background 0.2s ease",
    }}
    onClick={() => handleViewChunks(f.session_id)}
    onMouseEnter={(e) => (e.currentTarget.style.background = "#334155")}
    onMouseLeave={(e) => (e.currentTarget.style.background = "#1e293b")}
  >
    <div style={{ fontWeight: 600 }}>{f.original_filename}</div>
    <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>
      Uploaded: {new Date(f.uploaded_at).toLocaleString()}
    </div>
    {(f.uploaded_by || f.uploaded_by_name || f.uploaded_by_role) && (
      <div style={{ fontSize: 12, color: "#a1a1aa", marginTop: 2 }}>
        By: {f.uploaded_by_name || f.uploaded_by?.username || f.uploaded_by?.email || "Unknown"}
        {f.uploaded_by_role ? ` • ${f.uploaded_by_role}` : (f.uploaded_by?.role ? ` • ${f.uploaded_by.role}` : "")}
      </div>
    )}
  </li>
))}

        </ul>
      </div>
    </div>
  );
}