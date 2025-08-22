// src/Decks.jsx
import React, { useEffect, useState } from "react";
import { listPPTs } from "./api";

export default function Decks({ sessionId }) {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState("");

  async function loadFiles() {
    try {
      setError("");
      const res = await listPPTs(sessionId || null);
      setFiles(res.files || []);
    } catch (e) {
      setError(e.message || "Failed to list PPTs");
    }
  }

  useEffect(() => {
    loadFiles();
  }, [sessionId]);

  return (
    <div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Decks</h2>
        <button className="btn" onClick={loadFiles}>Refresh</button>
      </div>

      {error && <div style={{ color: "#fca5a5" }}>{error}</div>}

      <div style={{ display: "flex", gap: 20 }}>
        {/* Sidebar with uploaded PPTs */}
        <div style={{ flex: "0 0 320px", borderRight: "1px solid #333", paddingRight: 12 }}>
          <div style={{ marginBottom: 8, color: "#94a3b8" }}>Uploaded PPTs</div>
          {files.length === 0 && <div style={{ color: "#94a3b8" }}>No PPTs yet.</div>}
          <ul style={{ listStyle: "none", padding: 0 }}>
            {files.map((f) => (
              <li key={f.id} style={{ padding: "8px 0", borderBottom: "1px solid #1f2937" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{f.original_filename}</div>
                    <div style={{ fontSize: 12, color: "#94a3b8" }}>
                      {f.num_slides} slides • uploaded {f.uploaded_at?.split("T")[0]}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <button className="btn" onClick={() => setSelectedFile(f)}>Open</button>
                    {f.download_url && <a className="btn" href={f.download_url} download>Download</a>}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Viewer */}
        <div style={{ flex: 1, paddingLeft: 12 }}>
          {selectedFile ? (
            <>
              <h3 style={{ marginTop: 0 }}>{selectedFile.original_filename}</h3>
             {selectedFile.pdf_preview ? (
  <iframe
    src={`http://127.0.0.1:8000${selectedFile.pdf_preview}`}
    width="100%"
    height="600px"
    style={{ border: "none" }}
    title="pdf-viewer"
  />
) : (
  <div style={{ color: "#94a3b8" }}>No PPT preview available for this file.</div>
)}
            </>
          ) : (
            <div style={{ color: "#94a3b8" }}>Click a PPT on the left to view it.</div>
          )}
        </div>
      </div>
    </div>
  );
}
