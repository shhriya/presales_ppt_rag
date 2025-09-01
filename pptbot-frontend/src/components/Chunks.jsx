import React, { useEffect, useState } from "react";
import { listFiles } from "../api/api";
import { useNavigate } from "react-router-dom";

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
    <div>
      <h2 style={{ textAlign: "center" }}>Select a file to view chunks</h2>
      {error && <div style={{ color: "#fca5a5", textAlign: "center" }}>{error}</div>}

      <ul style={{ listStyle: "none", padding: 0, maxWidth: 600, margin: "0 auto" }}>
        {files.map((f) => (
          <li key={f.id} style={{ marginBottom: 16, padding: 12, background: "#1e293b", borderRadius: 8, color: "#fff", cursor: "pointer" }} onClick={() => handleViewChunks(f.session_id)}>
            {f.original_filename}
          </li>
        ))}
      </ul>
    </div>
  );
}
