import { useState } from "react";
import "../assets/style.css";
import { uploadFile, askQuestion } from "../api/api.js";
import Chat from "../components/Chat";
import Groups from "../components/Groups.jsx";
import Chunks from "../components/Chunks";
import { useAuth } from "../context/AuthContext.jsx";

export default function TabsApp() {
  const { user } = useAuth(); // get logged-in user
  const userRole = user?.role; // role must be set on login

  const [sessionId, setSessionId] = useState(null);
  const [slides, setSlides] = useState(0);
  const [messages, setMessages] = useState([]);
  const [isIndexing, setIsIndexing] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("chat"); // chat, decks, chunks

  async function handleUpload() {
    if (!file) {
      setError("Please choose a file.");
      return;
    }
    setError(""); setIsIndexing(true); setMessages([]);
    try {
      const res = await uploadFile(file);
      setSessionId(res.session_id);
      setSlides(res.items_count || 0);
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
    setMessages(next); setIsAsking(true);
    try {
      const res = await askQuestion(sessionId, question);
      setMessages([...next, { role: "assistant", content: res.answer }]);
    } catch (e) {
      setMessages([...next, { role: "assistant", content: "Error: " + (e.message || "ask failed") }]);
    } finally {
      setIsAsking(false);
    }
  }

  const visibleTabs = {
    admin: ["chat", "groups", "chunks"],
    developer: ["groups", "chunks"],
    employee: ["chat", "groups"],
    client: ["chat", "groups"]
  };

  const tabsToShow = visibleTabs[userRole] || ["chat"];

  return (
    <div className="app">
      <div className="header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
  <div>
    <h1>PreSales Insight Bot</h1>
    <div className="sub">AI assistant for exploring and managing presales presentation content.</div>
  </div>
  <button
    className="btn"
    onClick={() => window.location.href = "/logout"}
    style={{ background: "#f87171", color: "#fff", borderRadius: 6, padding: "6px 12px" }}
  >
    Logout
  </button>
</div>


      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {tabsToShow.includes("chat") && (
          <button className="btn" onClick={() => setActiveTab("chat")} style={{ opacity: activeTab === "chat" ? 1 : 0.7 }}>Chat</button>
        )}
        {tabsToShow.includes("groups") && (
          <button className="btn" onClick={() => setActiveTab("groups")} style={{ opacity: activeTab === "groups" ? 1 : 0.7 }}>Groups</button>
        )}
        {tabsToShow.includes("chunks") && (
          <button className="btn" onClick={() => setActiveTab("chunks")} style={{ opacity: activeTab === "chunks" ? 1 : 0.7 }}>Chunks</button>
        )}
      </div>

      {/* Panels */}
      {activeTab === "chat" && tabsToShow.includes("chat") && (
        <>
          <div className="panel" style={{ marginBottom: 12 }}>
            <div className="uploader">
              <input type="file" onChange={(e) => setFile(e.target.files?.[0])} />
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
            {isAsking && <div className="status" style={{ marginTop: 8 }}>Thinking…</div>}
          </div>
        </>
      )}

      {activeTab === "groups" && tabsToShow.includes("groups") && (
        <div className="panel">
          <Groups />
        </div>
      )}

      {activeTab === "chunks" && tabsToShow.includes("chunks") && (
        <div className="panel">
          <Chunks />
        </div>
      )}
    </div>
  );
}
