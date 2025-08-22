import React, { useEffect, useState } from "react";
import { listPPTs, listChunks } from "./api";

export default function Chunks() {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [chunks, setChunks] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadFiles() {
      try {
        setError("");
        const res = await listPPTs();
        setFiles(res.files || []);
      } catch (e) {
        setError(e.message || "Failed to list PPTs");
      }
    }
    loadFiles();
  }, []);

  async function handleViewChunks(file) {
    setSelectedFile(file);
    setChunks([]);
    try {
      setError("");
      const res = await listChunks(file.session_id);
      setChunks(res.chunks || []);
    } catch (e) {
      setError(e.message || "Failed to fetch chunks");
    }
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12, justifyContent: "center" }}>
        <h2 style={{ margin: 0 }}>Chunks</h2>
      </div>
      {error && <div style={{ color: "#fca5a5", textAlign: "center" }}>{error}</div>}
      <div style={{ display: "flex", justifyContent: "center", marginTop: 32 }}>
        <div style={{ minWidth: 400, maxWidth: 600 }}>
          <div style={{ marginBottom: 12, color: "#94a3b8", fontSize: 16, fontWeight: 500, textAlign: "center" }}>Uploaded PPTs</div>
          {files.length === 0 && <div style={{ color: "#94a3b8", textAlign: "center" }}>No PPTs yet.</div>}
          <ul style={{ listStyle: "none", padding: 0 }}>
            {files.map((f) => (
              <li key={f.id} style={{ padding: "12px 0", borderBottom: "1px solid #1f2937", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 16 }}>{f.original_filename}</div>
                  <div style={{ fontSize: 13, color: "#94a3b8" }}>
                    {f.num_slides} slides • uploaded {f.uploaded_at?.split("T")[0]}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <button className="btn" onClick={() => handleViewChunks(f)}>View Chunks</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
      {/* Chunks Viewer */}
      {selectedFile && (
        <div style={{ marginTop: 40, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <h3 style={{ color: "#334155" }}>{selectedFile.original_filename} - Chunks</h3>
          {chunks.length === 0 && <div style={{ color: "#94a3b8" }}>No chunks found for this PPT.</div>}
          <ul style={{ listStyle: "none", padding: 0, width: "80vw", maxWidth: 900 }}>
            {chunks.map((chunk, idx) => (
              <li key={chunk.id || idx} style={{ marginBottom: 24, background: "#1e293b", borderRadius: 8, padding: 20, color: "#fff", boxShadow: "0 2px 8px #0002" }}>
                <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 8 }}>Chunk {chunk.chunk_number || idx + 1}</div>
                <div style={{ fontSize: 15, color: "#cbd5e1", whiteSpace: "pre-wrap" }}>{chunk.content}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}