// src/SlideGallery.jsx
import React, { useState } from "react";

export default function SlideGallery({ slides = [], downloadUrl = null }) {
  const [active, setActive] = useState(null);

  return (
    <div>
      {downloadUrl && (
        <div style={{ marginBottom: 12 }}>
          <a className="btn" href={downloadUrl} download>Download original PPT</a>
        </div>
      )}

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
        gap: 12
      }}>
        {slides.map((s) => (
          <div key={s.id} style={{
            padding: 12,
            borderRadius: 8,
            border: "1px solid #1f2937",
            background: "rgba(255,255,255,0.02)",
            cursor: "pointer"
          }} onClick={() => setActive(s)}>
            <div style={{ fontWeight: 700 }}>Slide {s.slide_index}</div>
            <div style={{ marginTop: 8, whiteSpace: "pre-wrap", textAlign: "left", color: "#d1d5db", maxHeight: 200, overflow: "auto", fontSize: 13 }}>
              {s.slide_text || <span style={{ color: "#6b7280" }}>No recognized text on this slide.</span>}
            </div>
          </div>
        ))}
      </div>

      {active && (
        <div style={{
          marginTop: 12,
          padding: 12,
          borderRadius: 8,
          border: "1px solid #1f2937",
          background: "rgba(255,255,255,0.02)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div style={{ fontWeight: 700 }}>Slide {active.slide_index}</div>
            <button className="btn" onClick={() => setActive(null)}>Close</button>
          </div>
          <div style={{ marginTop: 8, textAlign: "left", whiteSpace: "pre-wrap" }}>
            {active.slide_text || <i>No text captured for this slide.</i>}
          </div>
        </div>
      )}
    </div>
  );
}
