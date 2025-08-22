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
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12, justifyContent: "center" }}>
        <h2 style={{ margin: 0 }}>Decks</h2>
        <button className="btn" onClick={loadFiles}>Refresh</button>
      </div>

      {error && <div style={{ color: "#fca5a5", textAlign: "center" }}>{error}</div>}

      {/* Centered list */}
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
                  <button className="btn" onClick={() => setSelectedFile(f)}>Open</button>
                  {f.download_url && <a className="btn" href={f.download_url} download>Download</a>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Full screen modal for PPT preview */}
      {selectedFile && selectedFile.pdf_preview && (
        <div
          style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(20, 20, 40, 0.95)",
            zIndex: 1000,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center"
          }}
          onClick={() => setSelectedFile(null)}
        >
          <div style={{ width: "90vw", height: "90vh", background: "#fff", borderRadius: 12, boxShadow: "0 0 24px #0008", position: "relative", overflow: "hidden" }}>
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
                fontSize: 18
              }}
              onClick={e => { e.stopPropagation(); setSelectedFile(null); }}
            >
              Close
            </button>
            <iframe
              src={`http://127.0.0.1:8000${selectedFile.pdf_preview}`}
              width="100%"
              height="100%"
              style={{ border: "none", borderRadius: "12px", background: "#fff" }}
              title="pdf-viewer"
            />
          </div>
        </div>
      )}
    </div>
  );
}




{/* 

// import React, { useEffect, useState } from "react";
// import { listPPTs } from "./api";

// export default function Decks({ sessionId }) {
//   const [files, setFiles] = useState([]);
//   const [selectedFile, setSelectedFile] = useState(null);
//   const [error, setError] = useState("");

//   async function loadFiles() {
//     try {
//       setError("");
//       const res = await listPPTs(sessionId || null);
//       setFiles(res.files || []);
//     } catch (e) {
//       setError(e.message || "Failed to list PPTs");
//     }
//   }

//   useEffect(() => {
//     loadFiles();
//   }, [sessionId]);

//   return (
//     <div>
//       <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
//         <h2 style={{ margin: 0 }}>Decks</h2>
//         <button className="btn" onClick={loadFiles}>Refresh</button>
//       </div>

//       {error && <div style={{ color: "#fca5a5" }}>{error}</div>}

//       <div style={{ display: "flex", gap: 40 }}>
//   {/* Sidebar with uploaded PPTs */}
//   <div style={{ flex: "0 0 280px", borderRight: "2px solid #334155", paddingRight: 18 }}>
//     <div style={{ marginBottom: 12, color: "#94a3b8", fontSize: 16, fontWeight: 500 }}>Uploaded PPTs</div>
//     {files.length === 0 && <div style={{ color: "#94a3b8" }}>No PPTs yet.</div>}
//     <ul style={{ listStyle: "none", padding: 0 }}>
//       {files.map((f) => (
//         <li key={f.id} style={{ padding: "12px 0", borderBottom: "1px solid #1f2937" }}>
//           <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
//             <div>
//               <div style={{ fontWeight: 600, fontSize: 16 }}>{f.original_filename}</div>
//               <div style={{ fontSize: 13, color: "#94a3b8" }}>
//                 {f.num_slides} slides • uploaded {f.uploaded_at?.split("T")[0]}
//               </div>
//             </div>
//             <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
//               <button className="btn" onClick={() => setSelectedFile(f)}>Open</button>
//               {f.download_url && <a className="btn" href={f.download_url} download>Download</a>}
//             </div>
//           </div>
//         </li>
//       ))}
//     </ul>
//   </div>

//   {/* Viewer */}
//   <div style={{ flex: 1, paddingLeft: 32 }}>
//     {selectedFile ? (
//       <>
//         <h3 style={{ marginTop: 0, fontSize: 22 }}>{selectedFile.original_filename}</h3>
//         {selectedFile.pdf_preview ? (
//           <iframe
//             src={`http://127.0.0.1:8000${selectedFile.pdf_preview}`}
//             width="98%"
//             height="900px"
//             style={{ border: "2px solid #334155", borderRadius: "10px", background: "#fff" }}
//             title="pdf-viewer"
//           />
//         ) : (
//           <div style={{ color: "#94a3b8" }}>No PPT preview available for this file.</div>
//         )}
//       </>
//     ) : (
//       <div style={{ color: "#94a3b8" }}>Click a PPT on the left to view it.</div>
//     )}
//   </div>
// </div>
//     </div>
//   );
// } */}
