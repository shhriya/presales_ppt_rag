import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
 
const BASE = "http://127.0.0.1:9000";
const FIXED_SESSION_ID = "0000000000";
 
export default function RagasEvaluation() {
  const navigate = useNavigate();
  const { user } = useAuth();
 
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [error, setError] = useState(null);
 
  // Fetch history from backend
  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/api/ragas/history?session_id=${FIXED_SESSION_ID}`, {
        headers: {
          Accept: "application/json",
          ...(user?.user_id && { "X-User-Id": String(user.user_id) }),
        },
        credentials: "include",
      });
 
      const data = await res.json();
      setHistory(Array.isArray(data.history) ? data.history : []);
    } catch (err) {
      console.error("History fetch failed:", err);
      setError("Failed to load evaluation history");
    }
  }, [user]);
 
  // Fetch latest question from RagasConfig
  const fetchLatestQuestion = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/api/ragas/config/latest_question`, {
        headers: {
          Accept: "application/json",
          ...(user?.user_id && { "X-User-Id": String(user.user_id) }),
        },
        credentials: "include",
      });
 
      if (!res.ok) throw new Error("Failed to fetch latest question");
 
      const data = await res.json();
      setCurrentQuestion(data.question || "");
    } catch (err) {
      console.error("Latest question fetch failed:", err);
      setError("Failed to fetch latest question from server");
    }
  }, [user]);
 
  // Run evaluation
  const runEvaluation = async () => {
  if (!currentQuestion) {
    setError("No question found for this session.");
    return;
  }
 
  setLoading(true);
  setError(null);
 
  try {
    const response = await fetch(`${BASE}/api/ragas/run`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(user?.user_id && { "X-User-Id": String(user.user_id) }),
      },
      credentials: "include",
      body: JSON.stringify({
        question: currentQuestion,
        user_id: user?.user_id || null, // optional, matches Pydantic
      }),
    });
 
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }
 
    // Reload history after successful evaluation
    await fetchHistory();
  } catch (err) {
    console.error("Run failed:", err);
    setError(err.message || "Failed to run evaluation");
  } finally {
    setLoading(false);
  }
};
 
 
  // On mount: fetch latest question + history
  useEffect(() => {
    fetchLatestQuestion();
    fetchHistory();
  }, [fetchLatestQuestion, fetchHistory]);
 
  return (
    <div
      className="ragas-eval-root"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 13,
        padding: 10,
        maxWidth: 1200,
        margin: "0 auto",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: 24, margin: 0 }}>RAGAS Evaluation</h1>
        <div
          style={{
            padding: "5px 10px",
            background: "#f0f0f0",
            borderRadius: 4,
            fontSize: 14,
            color: "#666",
          }}
        >
          Session: {FIXED_SESSION_ID}
        </div>
      </div>
 
      {error && (
        <div
          style={{
            padding: "10px 15px",
            background: "#ffebee",
            color: "#c62828",
            borderRadius: 4,
            marginBottom: 10,
          }}
        >
          {error}
        </div>
      )}
 
      {/* Buttons */}
      <div style={{ display: "flex", gap: 15, flexWrap: "wrap" }}>
        <button
          onClick={runEvaluation}
          disabled={loading || !currentQuestion}
          style={{
            padding: "10px 20px",
            background: currentQuestion ? "#4b8df8" : "#ccc",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: currentQuestion ? "pointer" : "not-allowed",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Running..." : "Run Evaluation"}
        </button>
 
        <button
          onClick={() => navigate("/ragas/config")}
          style={{
            padding: "10px 20px",
            background: "#222",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          Edit Configuration
        </button>
      </div>
 
{/* History Table */}
<div style={{ marginTop: 0 }}>
  <h2>History</h2>
 
  <div
    style={{
      maxHeight: "250px",
      overflowY: "auto",
      border: "1px solid #ccc",
      borderRadius: 8,
      padding: 5,
      background: "#fafafa"
    }}
  >
    <table
      cellPadding={10}
      style={{
        borderCollapse: "collapse",
        width: "100%",
        fontSize: 14,
      }}
    >
      <thead style={{ position: "sticky", top: 0, background: "#eee", zIndex: 5 }}>
        <tr>
          <th>ID</th>
          <th>User</th>
          <th>Date</th>
          <th>Overall</th>
          <th>Faithfulness</th>
          <th>Context Precision</th>
          <th>Context Recall</th>
        </tr>
      </thead>
      <tbody>
        {history.map((row) => (
          <tr key={row.id}>
            <td>{row.id}</td>
            <td>{row.user_id}</td>
            <td>{new Date(row.created_at).toLocaleString()}</td>
            <td>{row.overall_score != null ? row.overall_score.toFixed(4) : "-"}</td>
<td>{row.faithfulness != null ? row.faithfulness.toFixed(4) : "-"}</td>
<td>{row.context_precision != null ? row.context_precision.toFixed(4) : "-"}</td>
<td>{row.context_recall != null ? row.context_recall.toFixed(4) : "-"}</td>
 
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>
 
    </div>
  );
}
 
 