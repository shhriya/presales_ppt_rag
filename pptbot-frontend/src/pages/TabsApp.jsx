import { useState, useEffect } from "react";
import "../assets/style.css";
import { uploadFile, askQuestion, listMySessions, deleteSession, getSessionChatHistory } from "../api/api.js";
import Chat from "../components/Chat";
import UserMenu from "../components/UserMenu.jsx";
import Groups from "../components/Groups.jsx";
import Chunks from "../components/Chunks";
import { useAuth } from "../context/AuthContext.jsx";
import AdminUsers from "./AdminUsers.jsx";

export default function TabsApp() {
  const { user } = useAuth(); // get logged-in user
  const userRole = user?.role; // role must be set on login

  const [sessionId, setSessionId] = useState(null);
  const [slides, setSlides] = useState(0);
  const [currentFilename, setCurrentFilename] = useState("");
  const [messages, setMessages] = useState([]);
  const [isIndexing, setIsIndexing] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("chat"); // chat, groups, chunks, admin
  const [sessions, setSessions] = useState([]);
  const [sessionMessages, setSessionMessages] = useState({}); // sessionId -> messages array

  // Initialize tab from URL (?tab=groups/admin/...) and keep URL updated
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const initial = (url.searchParams.get("tab") || "").toLowerCase();
      if (initial && ["chat", "groups", "chunks", "admin"].includes(initial)) {
        setActiveTab(initial);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setActiveTabAndUrl(tab) {
    setActiveTab(tab);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      window.history.replaceState({}, "", url);
    } catch {}
  }

  // Restore chat state from localStorage on mount
  useEffect(() => {
    try {
      const savedSession = localStorage.getItem("chat_session_id");
      const savedSlides = localStorage.getItem("chat_slides");
      const savedSessionMessages = localStorage.getItem("chat_session_messages");
      if (savedSession) setSessionId(savedSession);
      if (savedSlides) setSlides(Number(savedSlides) || 0);
      if (savedSessionMessages) setSessionMessages(JSON.parse(savedSessionMessages));
    } catch {}
  }, []);

  // Load chat history from database when session changes
  useEffect(() => {
    if (sessionId && user?.user_id) {
      // Load chat history from database
      getSessionChatHistory(sessionId)
        .then(historyRes => {
          const dbMessages = historyRes.messages || [];
          setMessages(dbMessages);
          setSessionMessages(prev => ({ ...prev, [sessionId]: dbMessages }));
        })
        .catch(e => {
          console.warn("Failed to load chat history from database:", e);
          // Fallback to localStorage or empty array
          setMessages([]);
        });
    } else if (sessionId) {
      // If no user but session exists, try to load from localStorage
      const localMessages = sessionMessages[sessionId] || [];
      setMessages(localMessages);
    } else {
      setMessages([]);
    }
  }, [sessionId, user?.user_id]);

  // Persist chat state to localStorage
  useEffect(() => {
    try { sessionId ? localStorage.setItem("chat_session_id", sessionId) : localStorage.removeItem("chat_session_id"); } catch {}
  }, [sessionId]);
  useEffect(() => {
    try { localStorage.setItem("chat_slides", String(slides || 0)); } catch {}
  }, [slides]);
  useEffect(() => {
    try { localStorage.setItem("chat_session_messages", JSON.stringify(sessionMessages || {})); } catch {}
  }, [sessionMessages]);

  // Update current messages when session changes
  useEffect(() => {
    if (sessionId) {
      setMessages(sessionMessages[sessionId] || []);
    } else {
      setMessages([]);
    }
  }, [sessionId, sessionMessages]);

  // Load my sessions list
  const refreshSessions = async () => {
    try {
      if (!user?.user_id) return;
      const res = await listMySessions(user.user_id);
      setSessions(res.sessions || []);
    } catch {}
  };

  useEffect(() => {
    refreshSessions();
  }, [user]);

  // Create new session
  function createNewSession() {
    setSessionId(null);
    setSlides(0);
    setCurrentFilename("");
    setMessages([]);
    try { localStorage.removeItem("chat_session_id"); } catch {}
    // Refresh sessions list to show updated state
    refreshSessions();
  }

  // Delete session
  async function handleDeleteSession(sessionIdToDelete) {
    if (!window.confirm("Are you sure you want to delete this session? This will remove all chat history and files.")) {
      return;
    }
    try {
      await deleteSession(sessionIdToDelete, user?.user_id);
      // Remove from local state
      setSessionMessages(prev => {
        const newState = { ...prev };
        delete newState[sessionIdToDelete];
        return newState;
      });
      // If this was the current session, clear it
      if (sessionIdToDelete === sessionId) {
        createNewSession();
      }
      // Reload sessions list
      await refreshSessions();
    } catch (e) {
      setError(e.message || "Failed to delete session");
    }
  }

  // Switch to a session
  async function switchToSession(session) {
    setSessionId(session.session_id);
    setCurrentFilename(session.last_file?.original_filename || "");
    try { localStorage.setItem("chat_session_id", session.session_id); } catch {}
    
    // Load chat history from database
    if (user?.user_id) {
      try {
        const historyRes = await getSessionChatHistory(session.session_id);
        const dbMessages = historyRes.messages || [];
        setMessages(dbMessages);
        setSessionMessages(prev => ({ ...prev, [session.session_id]: dbMessages }));
      } catch (e) {
        console.warn("Failed to load chat history:", e);
        // Fallback to localStorage if database fails
        const localMessages = sessionMessages[session.session_id] || [];
        setMessages(localMessages);
      }
    } else {
      // If no user, just load from localStorage
      const localMessages = sessionMessages[session.session_id] || [];
      setMessages(localMessages);
    }
  }

  async function handleUpload() {
    if (!file) {
      setError("Please choose a file.");
      return;
    }
    setError(""); setIsIndexing(true);
    try {
      const res = await uploadFile(file, user, sessionId);
      const newSessionId = res.session_id;
      setSessionId(newSessionId);
      setSlides(res.items_count || 0);
      setCurrentFilename(res.filename || (file?.name || ""));
      // Refresh sessions list to show the new/updated session
      await refreshSessions();
    } catch (e) {
      setError(e.message || "Upload failed.");
    } finally {
      setIsIndexing(false);
    }
  }

  async function handleSend(question) {
    if (!sessionId) { 
      setError("Please upload a file first to start a session."); 
      return; 
    }
    setError("");
    const next = [...messages, { role: "user", content: question }];
    setMessages(next); setIsAsking(true);
    try {
      const res = await askQuestion(sessionId, question);
      const finalMessages = [...next, { role: "assistant", content: res.answer }];
      setMessages(finalMessages);
      // Update session messages
      setSessionMessages(prev => ({ ...prev, [sessionId]: finalMessages }));
    } catch (e) {
      const errorMessages = [...next, { role: "assistant", content: "Error: " + (e.message || "ask failed") }];
      setMessages(errorMessages);
      setSessionMessages(prev => ({ ...prev, [sessionId]: errorMessages }));
    } finally {
      setIsAsking(false);
    }
  }

  const visibleTabs = {
    admin: ["chat", "groups", "chunks", "admin"],
    developer: ["chat", "groups", "chunks"],
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
  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <UserMenu />
    <button
      className="btn"
      onClick={() => window.location.href = "/logout"}
      style={{ background: "#f87171", color: "#fff", borderRadius: 6, padding: "6px 12px" }}
    >
      Logout
    </button>
  </div>
</div>


      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {tabsToShow.includes("chat") && (
          <button className="btn" onClick={() => setActiveTabAndUrl("chat")} style={{ opacity: activeTab === "chat" ? 1 : 0.7 }}>Chat</button>
        )}
        {tabsToShow.includes("groups") && (
          <button className="btn" onClick={() => setActiveTabAndUrl("groups")} style={{ opacity: activeTab === "groups" ? 1 : 0.7 }}>Groups</button>
        )}
        {tabsToShow.includes("chunks") && (
          <button className="btn" onClick={() => setActiveTabAndUrl("chunks")} style={{ opacity: activeTab === "chunks" ? 1 : 0.7 }}>Chunks</button>
        )}
        {tabsToShow.includes("admin") && (
          <button className="btn" onClick={() => setActiveTabAndUrl("admin")} style={{ opacity: activeTab === "admin" ? 1 : 0.7 }}>Admin</button>
        )}
      </div>

      {/* Panels */}
      {activeTab === "chat" && tabsToShow.includes("chat") && (
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ width: 260, flex: "0 0 auto" }}>
            <div className="panel" style={{ padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontWeight: 600 }}>My Sessions</div>
                <button 
                  className="btn" 
                  onClick={createNewSession}
                  style={{ padding: "4px 8px", fontSize: 12, background: "#10b981", color: "#fff" }}
                >
                  + New
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 320, overflowY: "auto" }}>
                {sessions.map(s => (
                  <div key={s.session_id} style={{ display: "flex", gap: 4, alignItems: "flex-start" }}>
                    <button
                      className="btn"
                      onClick={() => switchToSession(s)}
                      style={{ 
                        flex: 1, 
                        textAlign: "left", 
                        background: s.session_id === sessionId ? "#2563eb" : undefined, 
                        color: s.session_id === sessionId ? "#fff" : undefined,
                        padding: "8px"
                      }}
                    >
                      <div style={{ fontWeight: 600 }}>{s.name || s.last_file?.original_filename || s.session_id}</div>
                      <div style={{ fontSize: 12, opacity: 0.8 }}>Updated: {s.last_file?.uploaded_at ? new Date(s.last_file.uploaded_at).toLocaleString() : (s.created_at ? new Date(s.created_at).toLocaleString() : "")}</div>
                    </button>
                    <button
                      className="btn"
                      onClick={() => handleDeleteSession(s.session_id)}
                      style={{ 
                        padding: "4px 6px", 
                        fontSize: 12, 
                        background: "#ef4444", 
                        color: "#fff",
                        minWidth: "auto"
                      }}
                      title="Delete session"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {sessions.length === 0 && (
                  <div style={{ textAlign: "center", color: "#6b7280", fontSize: 14, padding: 20 }}>
                    No sessions yet. Upload a file to get started!
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="panel" style={{ marginBottom: 12 }}>
              <div className="uploader">
                <input type="file" onChange={(e) => setFile(e.target.files?.[0])} />
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button className="btn" onClick={handleUpload} disabled={isIndexing}>
                    {isIndexing ? "Indexing..." : "Upload & Index"}
                  </button>
                  <div className="status">
                    {sessionId && !isIndexing ? `Ready (slides: ${slides})${currentFilename ? ` • Current: ${currentFilename}` : ""}` :
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
                isAsking={isAsking}
                disabled={!sessionId || isIndexing || isAsking}
                onSend={handleSend}
              />
            </div>
          </div>
        </div>
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

      {activeTab === "admin" && tabsToShow.includes("admin") && (
        <div className="panel">
          <AdminUsers />
        </div>
      )}
    </div>
  );
}
