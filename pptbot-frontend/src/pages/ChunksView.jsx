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
      <Link to="/" style={{ marginLeft: 20, display: "inline-block", marginBottom: 12 }}>← Back</Link>
      <h2 style={{ textAlign: "center" }}>Chunks for {sessionId}</h2>
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
              color: "#fff",
              boxShadow: "0 2px 8px #0002",
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 8 }}>
              Chunk {chunk.chunk_number || idx + 1} {chunk.type ? `- ${chunk.type}` : ""}
            </div>
            <div style={{ fontSize: 15, color: "#cbd5e1", whiteSpace: "pre-wrap" }}>
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
