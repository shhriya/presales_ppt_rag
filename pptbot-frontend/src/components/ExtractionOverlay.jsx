import React from "react";
import { useExtraction } from "../context/ExtractionContext";

const ExtractionOverlay = () => {
  const { extracting } = useExtraction();

  if (!extracting) return null;

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
      background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "flex",
      alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "2rem"
    }}>
      Extraction in progress, please wait...
    </div>
  );
};

export default ExtractionOverlay;