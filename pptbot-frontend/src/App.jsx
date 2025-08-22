// // app.jsx
// pptbot-frontend/App.jsx
import { useState } from "react";
import "./style.css";
import { uploadPPT, askQuestion } from "./api";
import Chat from "./Chat";
import Decks from "./Decks";
import Chunks from "./Chunks";

export default function App() {
  const [sessionId, setSessionId] = useState(null);
  const [slides, setSlides] = useState(0);
  const [messages, setMessages] = useState([]);
  const [isIndexing, setIsIndexing] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState("chat"); // "chunks", "decks", "chat"

  async function handleUpload() {
    if (!file) { setError("Please choose a .pptx file."); return; }
    if (!file.name.toLowerCase().endsWith(".pptx")) {
      setError("Only .pptx files are supported.");
      return;
    }
    setError(""); setIsIndexing(true);
    setMessages([]);
    try {
      const res = await uploadPPT(file);
      setSessionId(res.session_id);
      setSlides(res.slides);
      // keep user on chat tab (chat still works), but Frontend Decks will refresh automatically when sessionId changes
    } catch (e) {
      setError(e.message || "Upload failed.");
    } finally {
      setIsIndexing(false);
    }
  }

  async function handleSend(question) {
    if (!sessionId) { setError("Upload a PPT first."); return; }
    setError("");

    const next = [...messages, { role: "user", content: question }];
    setMessages(next);
    setIsAsking(true);

    try {
      const res = await askQuestion(sessionId, question);
      setMessages([...next, { role: "assistant", content: res.answer }]);
    } catch (e) {
      setMessages([...next, { role: "assistant", content: "Error: " + (e.message || "ask failed") }]);
    } finally {
      setIsAsking(false);
    }
  }

  return (
    <div className="app">
      <div className="header">
        <h1>PreSales Insight Bot</h1>
        <div className="sub">AI assistant for exploring and managing presales presentation content.</div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button className="btn" onClick={() => setActiveTab("chat")} style={{ opacity: activeTab === "chat" ? 1 : 0.7 }}>Chat</button>
        <button className="btn" onClick={() => setActiveTab("decks")} style={{ opacity: activeTab === "decks" ? 1 : 0.7 }}>Decks</button>
        <button className="btn" onClick={() => setActiveTab("chunks")} style={{ opacity: activeTab === "chunks" ? 1 : 0.7 }}>Chunks</button>
      </div>

      {activeTab === "chat" && (
        <>
          <div className="panel" style={{ marginBottom: 12 }}>
            <div className="uploader">
              <input type="file" accept=".pptx" onChange={(e) => setFile(e.target.files?.[0])} />
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button className="btn" onClick={handleUpload} disabled={isIndexing}>
                  {isIndexing ? "Indexing..." : "Upload & Index"}
                </button>
                <div className="status">
                  {sessionId && !isIndexing ? `Ready (slides: ${slides})` :
                   isIndexing ? "Extracting slides, OCR, building FAISS..." :
                   "No session yet"}
                </div>
              </div>
              {error && <div style={{ color: "#fca5a5" }}>{error}</div>}
            </div>
          </div>

          <div className="panel">
            <Chat
              messages={messages}
              disabled={!sessionId || isIndexing || isAsking}
              onSend={handleSend}
            />
            {(isAsking) && <div className="status" style={{ marginTop: 8 }}>Thinking…</div>}
          </div>
        </>
      )}

      {activeTab === "decks" && (
        <div className="panel">
          <Decks sessionId={sessionId} />
        </div>
      )}

      {activeTab === "chunks" && (
        <div className="panel">
          <Chunks />
        </div>
      )}
    </div>
  );
}




// import { useState } from "react";
// import "./style.css";
// import { uploadPPT, askQuestion } from "./api";
// import Chat from "./Chat";
 
// export default function App() {
//   const [sessionId, setSessionId] = useState(null);
//   const [slides, setSlides] = useState(0);
//   const [messages, setMessages] = useState([]);
//   const [isIndexing, setIsIndexing] = useState(false);
//   const [isAsking, setIsAsking] = useState(false);
//   const [file, setFile] = useState(null);
//   const [error, setError] = useState("");
 
//   async function handleUpload() {
//     if (!file) { setError("Please choose a .pptx file."); return; }
//     if (!file.name.toLowerCase().endsWith(".pptx")) {
//       setError("Only .pptx files are supported.");
//       return;
//     }
//     setError(""); setIsIndexing(true);
//     setMessages([]);
//     try {
//       const res = await uploadPPT(file);
//       setSessionId(res.session_id);
//       setSlides(res.slides);
//     } catch (e) {
//       setError(e.message || "Upload failed.");
//     } finally {
//       setIsIndexing(false);
//     }
//   }
 
// async function handleSend(question) {
//   console.log("handleSend got:", question);
//   if (!sessionId) { setError("Upload a PPT first."); return; }
//   setError("");

//   const next = [...messages, { role: "user", content: question }];
//   setMessages(next);
//   setIsAsking(true);

//   try {
//     const res = await askQuestion(sessionId, question); // sends just question
//     console.log("User typed:", question);
//     console.log("Assistant response raw:", res);

//     setMessages([...next, { role: "assistant", content: res.answer }]);
//   } catch (e) {
//     setMessages([...next, { role: "assistant", content: "Error: " + (e.message || "ask failed") }]);
//   } finally {
//     setIsAsking(false);
//   }
// }
 
//   return (
//     <div className="app">
//       <div className="header">
//         <h1>PreSales Insight Bot</h1>
//         <div className="sub">AI assistant for exploring and managing presales presentation content.</div>
//       </div>
 
//       <div className="panel" style={{ marginBottom: 12 }}>
//         <div className="uploader">
//           <input type="file" accept=".pptx" onChange={(e) => setFile(e.target.files?.[0])} />
//           <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
//             <button className="btn" onClick={handleUpload} disabled={isIndexing}>
//               {isIndexing ? "Indexing..." : "Upload & Index"}
//             </button>
//             <div className="status">
//               {sessionId && !isIndexing ? `Ready (slides: ${slides})` :
//                isIndexing ? "Extracting slides, OCR, building FAISS..." :
//                "No session yet"}
//             </div>
//           </div>
//           {error && <div style={{ color: "#fca5a5" }}>{error}</div>}
//         </div>
//       </div>
 
//       <div className="panel">
//         <Chat
//           messages={messages}
//           disabled={!sessionId || isIndexing || isAsking}
//           onSend={handleSend}
//         />
//         {(isAsking) && <div className="status" style={{ marginTop: 8 }}>Thinking…</div>}
//       </div>
//     </div>
//   );
// }
 
