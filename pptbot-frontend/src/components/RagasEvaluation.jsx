import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./RagasConfig.css";

const BASE = "http://127.0.0.1:8000";
const FIXED_SESSION_ID = "0000000000";

export default function RagasEvaluation() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [error, setError] = useState(null);

  // State for viewing record details
  const [selectedRecord, setSelectedRecord] = useState(null);

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

      if (res.status === 404) {
        setHistory([]);
        return;
      }

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
      setError("Failed to fetch latest question from server. Please configure a question.");
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
          user_id: user?.user_id || null,
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

  function formatScore(val) {
    if (val === null || val === undefined || isNaN(val)) return "-";
    const num = Number(val);
    // Truncate to 3 decimal places without rounding
    return (Math.trunc(num * 1000) / 1000).toFixed(3);
  }

  function toIST(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);
    // Add 5 hours 30 minutes to UTC time
    const istTime = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
    return istTime.toLocaleString("en-IN", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }) + " IST";
  }

  return (
    <div className="ragas-config-container">
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h1>RAGAS Evaluation</h1>
        <div className="text-sm font-medium px-3 py-1 bg-gray-100 rounded-full text-gray-600">
          Session ID: {FIXED_SESSION_ID}
        </div>
      </div>

      {error && (
        <div className="config-card" style={{ borderColor: '#fca5a5', background: '#fff1f2', color: '#b91c1c' }}>
          <i className="bi bi-exclamation-triangle-fill mr-2"></i> {error}
        </div>
      )}

      {/* Actions */}
      <div className="config-card">
        <h2><i className="bi bi-play-circle"></i> Evaluation Controls</h2>
        <div className="mt-4 flex gap-2 flex-wrap">
          <button
            onClick={runEvaluation}
            disabled={loading || !currentQuestion}
            className={`ragas-btn ${currentQuestion ? 'btn-primary-ragas' : 'btn-secondary-ragas'}`}
          >
            <i className="bi bi-play-fill"></i> {loading ? "Running..." : "Run Evaluation"}
          </button>

          <button
            onClick={() => navigate("/ragas/config")}
            className="ragas-btn btn-secondary-ragas"
          >
            <i className="bi bi-pencil-square"></i> Edit Configuration
          </button>
        </div>
        {!currentQuestion && !loading && (
          <p className="mt-2 text-sm text-gray-500">
            <i className="bi bi-info-circle"></i> No question configured. Please visit configuration to set up questions.
          </p>
        )}
      </div>

      {/* History Table */}
      <div className="config-card">
        <h2><i className="bi bi-clock-history"></i> Evaluation History</h2>

        <div
          className="history-results-box"
          style={{
            marginTop: '1.5rem',
            overflowX: 'auto',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            background: '#ffffff',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            padding: '4px'
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "separate",
              borderSpacing: 0,
              fontSize: "0.875rem",
              textAlign: "left"
            }}
          >
            <thead style={{
              background: "#f8fafc",
              position: 'sticky',
              top: 0,
              zIndex: 10,
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}>
              <tr>
                <th style={{ padding: '12px 16px', background: 'inherit', borderBottom: "1px solid var(--border)" }}>ID</th>
                <th style={{ padding: '12px 16px', background: 'inherit', borderBottom: "1px solid var(--border)" }}>Date</th>
                <th style={{ padding: '12px 16px', background: 'inherit', borderBottom: "1px solid var(--border)" }}>Overall</th>
                <th style={{ padding: '12px 16px', background: 'inherit', borderBottom: "1px solid var(--border)" }}>Faithfulness</th>
                <th style={{ padding: '12px 16px', background: 'inherit', borderBottom: "1px solid var(--border)" }}>Ctx Precision</th>
                <th style={{ padding: '12px 16px', background: 'inherit', borderBottom: "1px solid var(--border)" }}>Ctx Recall</th>
                <th style={{ padding: '12px 16px', background: 'inherit', borderBottom: "1px solid var(--border)" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {history.length > 0 ? (
                history.map((row) => (
                  <tr key={row.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: '12px 16px' }}>{row.id}</td>
                    <td style={{ padding: '12px 16px' }}>{toIST(row.created_at)}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{formatScore(row.overall_score)}</td>
                    <td style={{ padding: '12px 16px' }}>{formatScore(row.faithfulness)}</td>
                    <td style={{ padding: '12px 16px' }}>{formatScore(row.context_precision)}</td>
                    <td style={{ padding: '12px 16px' }}>{formatScore(row.context_recall)}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <button
                        className="ragas-btn btn-secondary-ragas"
                        style={{ padding: '4px 8px', fontSize: '11px' }}
                        onClick={() => setSelectedRecord(row)}
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" style={{ padding: '24px', textAlign: 'center', color: 'var(--muted)' }}>
                    No evaluation records found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedRecord && (
        <div className="loading-overlay" onClick={() => setSelectedRecord(null)}>
          <div
            className="config-card"
            style={{ maxWidth: '800px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 style={{ margin: 0 }}>Evaluation Details (# {selectedRecord.id})</h3>
              <button
                onClick={() => setSelectedRecord(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            <div className="detail-section mb-4">
              <label className="setting-label text-primary" style={{ fontWeight: 600 }}>Question</label>
              <p className="bg-gray-50 p-3 rounded" style={{ whiteSpace: 'pre-wrap', border: '1px solid #eee' }}>
                {selectedRecord.question || "N/A"}
              </p>
            </div>

            <div className="detail-section mb-4">
              <label className="setting-label text-primary" style={{ fontWeight: 600 }}>Generated Answer</label>
              <p className="bg-gray-50 p-3 rounded" style={{ whiteSpace: 'pre-wrap', border: '1px solid #eee' }}>
                {selectedRecord.answer || "N/A"}
              </p>
            </div>

            <div className="detail-section mb-4">
              <label className="setting-label text-primary" style={{ fontWeight: 600 }}>Ground Truth</label>
              <p className="bg-gray-50 p-3 rounded" style={{ whiteSpace: 'pre-wrap', border: '1px solid #eee' }}>
                {selectedRecord.ground_truth || "N/A (using contexts fallback)"}
              </p>
            </div>

            <div className="mt-6 flex justify-end">
              <button className="ragas-btn btn-primary-ragas" onClick={() => setSelectedRecord(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
