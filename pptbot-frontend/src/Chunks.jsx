// src/Chunks.jsx
import React, { useEffect, useState } from "react";
import { getChunks } from "./api";

export default function Chunks() {
  const [chunks, setChunks] = useState([]);
  const [info, setInfo] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await getChunks({ limit: 10 });
        if (res && res.rows) {
          setChunks(res.rows);
        } else {
          setInfo("No chunks stored yet. Chunking will populate this tab when enabled.");
        }
      } catch (e) {
        setInfo("Chunks not available yet.");
      }
    }
    load();
  }, []);

  return (
    <div>
      <h2>Chunks (developer)</h2>
      {info && <div style={{ color: "#94a3b8" }}>{info}</div>}
      {chunks.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #333" }}>
                <th>File</th>
                <th>Slide</th>
                <th>Chunk</th>
              </tr>
            </thead>
            <tbody>
              {chunks.map(c => (
                <tr key={c.id} style={{ borderBottom: "1px solid #111" }}>
                  <td style={{ padding: 8 }}>{c.file_id}</td>
                  <td style={{ padding: 8 }}>{c.slide_id || "-"}</td>
                  <td style={{ padding: 8, whiteSpace: "pre-wrap" }}>{(c.text || "").slice(0, 200)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
