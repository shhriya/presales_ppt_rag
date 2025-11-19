import React, { useEffect, useState } from "react";
import { listChunks } from "../api/api";
import { useParams, Link } from "react-router-dom";

export default function ChunksView() {
  const { sessionId } = useParams();
  const [chunks, setChunks] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => {
  async function fetchChunks() {
    if (!sessionId) return;
    try {
      setError("");
      const res = await listChunks(sessionId); // <- now sessionId is correctly passed
      setChunks(res.chunks || []);
    } catch (e) {
      setError(e.message || "Failed to fetch chunks");
    }
  }
  fetchChunks();
}, [sessionId]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px', padding: '0 20px' }}>
        <Link 
          to="/?tab=chunks" 
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center',
            padding: '6px 12px',
            background: '#0a225e',
            color: 'white',
            borderRadius: '4px',
            textDecoration: 'none',
            transition: 'background-color 0.2s',
            ':hover': {
              backgroundColor: '#ff3c00'
            }
          }}
        >
          ← Back to Chunks
        </Link>
        <h2 style={{ margin: '0 auto', textAlign: 'center' }}>Chunks for {sessionId}</h2>
        <div style={{ width: '120px' }}></div> {/* For centering the title */}
      </div>
      {error && <div style={{ color: "#fca5a5", textAlign: "center" }}>{error}</div>}

      <ul style={{ listStyle: "none", padding: 0, maxWidth: 900, margin: "0 auto" }}>
        {chunks.map((chunk, idx) => (
          <li
            key={chunk.id || idx}
            style={{
              marginBottom: 24,
              background: "#1e293b",
              borderRadius: 8,
              padding: 20,
              color: "#ffffff",
              boxShadow: "0 2px 8px #0002",
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 8 }}>
              Chunk {chunk.chunk_number || idx + 1} {chunk.type ? `- ${chunk.type}` : ""}
            </div>
            <div style={{ fontSize: 15, color: "#e5e7eb", whiteSpace: "pre-wrap" }}>
              {typeof chunk.content === "object"
                ? JSON.stringify(chunk.content, null, 2)
                : chunk.content}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
