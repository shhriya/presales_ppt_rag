import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./RagasConfig.css";

const BASE = "http://127.0.0.1:8000";

export default function RagasConfig() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // STATES
  const [sessionId, setSessionId] = useState("");
  const [questions, setQuestions] = useState([{ question: "", ground_truth: "" }]);
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [model, setModel] = useState("gpt-4o-mini");
  const [topK, setTopK] = useState(3);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showQuestionsModal, setShowQuestionsModal] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Get or create session ID
  const getOrCreateSessionId = useCallback(() => {
    // Try to get from URL first
    const urlParams = new URLSearchParams(location.search);
    let sessionId = urlParams.get('session_id');

    // If not in URL, try to get from localStorage
    if (!sessionId) {
      sessionId = localStorage.getItem('current_ragas_session');
    }

    // If still no session ID, generate a new one
    if (!sessionId) {
      sessionId = `ragas_${Date.now()}`;
      // Update URL with the new session ID
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('session_id', sessionId);
      window.history.replaceState({}, '', newUrl);
    }

    // Save to localStorage for persistence
    localStorage.setItem('current_ragas_session', sessionId);
    return sessionId;
  }, [location.search]);

  // Load configuration from server
  const loadConfigFromServer = useCallback(async (sessionId) => {
    if (!sessionId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${BASE}/api/ragas/config?session_id=${sessionId}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          ...(user?.user_id && { 'X-User-Id': String(user.user_id) })
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load configuration');
      }

      const data = await response.json();

      if (data.config) {
        const config = data.config;

        // Update state with loaded config
        if (config.questions && Array.isArray(config.questions)) {
          // Normalize legacy string questions to objects
          const normalized = config.questions.map(q => {
            if (typeof q === 'string') return { question: q, ground_truth: "" };
            return q;
          });
          setQuestions(normalized.length > 0 ? normalized : [{ question: "", ground_truth: "" }]);
        }

        if (config.model) {
          setModel(config.model);
        }

        if (config.top_k) {
          setTopK(Number(config.top_k) || 3);
        }

        if (config.file_name) {
          setFilePreview(config.file_name);
          setFileUrl(`${BASE}/api/files/${encodeURIComponent(config.file_name)}`);
        }
      }

      return data.config;
    } catch (err) {
      console.error('Error loading config:', err);
      setError(err.message || 'Failed to load configuration');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Initialize component
  useEffect(() => {
    if (isInitialized) return;

    const initialize = async () => {
      try {
        // Get or create session ID
        const currentSessionId = getOrCreateSessionId();
        setSessionId(currentSessionId);

        // Load config from server
        await loadConfigFromServer(currentSessionId);

        setIsInitialized(true);
      } catch (err) {
        console.error('Initialization error:', err);
        setError('Failed to initialize configuration');
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, [getOrCreateSessionId, loadConfigFromServer, isInitialized]);

  // Load config on component mount and when session changes
  useEffect(() => {
    if (isInitialized) {
      loadConfigFromServer(sessionId);
    }
  }, [sessionId, isInitialized, loadConfigFromServer]);

  // HANDLE FILE UPLOAD
  function handleFileUpload(e) {
    const f = e.target.files[0];
    if (!f) return;

    setFile(f);
    setFilePreview(f.name);

    // Create a URL for the file to enable opening it later
    const fileUrl = URL.createObjectURL(f);
    setFileUrl(fileUrl);

    // Store file info in localStorage for persistence
    const fileInfo = {
      name: f.name,
      type: f.type,
      size: f.size,
      lastModified: f.lastModified
    };
    localStorage.setItem('ragasFileInfo', JSON.stringify(fileInfo));
  }

  // ADD QUESTION
  function addQuestion() {
    setQuestions([...questions, { question: "", ground_truth: "" }]);
  }

  // REMOVE QUESTION
  function removeQuestion(index) {
    const updated = [...questions];
    updated.splice(index, 1);
    if (updated.length === 0) updated.push({ question: "", ground_truth: "" });
    setQuestions(updated);
  }

  // UPDATE QUESTION TEXT OR GROUND TRUTH
  function updateQuestion(index, field, value) {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  }

  // SAVE CONFIG
  const saveConfig = async () => {
    if (!sessionId) {
      setError('No active session. Please refresh the page and try again.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const formData = new FormData();
      if (file) formData.append("file", file);
      formData.append("questions", JSON.stringify(questions));
      formData.append("model", model);
      formData.append("top_k", topK);

      const res = await fetch(`${BASE}/api/ragas/config`, {
        method: "POST",
        body: formData,
        headers: {
          ...(user?.user_id && { "X-User-Id": String(user.user_id) }),
        },
        credentials: "include"
      });

      if (!res.ok) throw new Error("Failed to save configuration");

      const data = await res.json();
      // Handle the data update
      if (data.config && Array.isArray(data.config.questions)) {
        const normalized = data.config.questions.map(q => {
          if (typeof q === 'string') return { question: q, ground_truth: "" };
          return q;
        });
        setQuestions(normalized);
      }

      setModel(data.config.model);
      setTopK(data.config.top_k);
      if (data.config.file_name) setFilePreview(data.config.file_name);

      alert("Configuration saved successfully!");
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to save configuration');
      alert("Failed to save configuration: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="ragas-config-container">
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
        </div>
      )}

      <h1>RAGAS Evaluation Configuration</h1>

      <div className="config-card">
        <h2><i className="bi bi-file-earmark-arrow-up"></i> Document Selection</h2>
        <div className="file-upload-container">
          <div className="file-upload-input">
            <input
              type="file"
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-500"
            />
          </div>
          {filePreview && (
            <div className="mt-2 flex items-center">
              <span className="file-preview-name">
                <i className="bi bi-file-earmark-check"></i> Selected: {filePreview}
              </span>
              {fileUrl && (
                <button
                  onClick={() => window.open(fileUrl, '_blank')}
                  className="ragas-btn btn-secondary-ragas"
                  style={{ marginLeft: '10px', padding: '4px 10px', fontSize: '12px' }}
                  title="Open file"
                >
                  View File
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="config-card">
        <h2><i className="bi bi-question-circle"></i> Question Set</h2>
        <div className="questions-container">
          {questions.map((qObj, idx) => (
            <div key={idx} className="question-item-group">
              <div className="question-item">
                <div style={{ flex: 1 }}>
                  <label className="setting-label" style={{ fontSize: '12px', marginBottom: '4px' }}>Question {idx + 1}</label>
                  <textarea
                    value={qObj.question}
                    onChange={(e) => updateQuestion(idx, 'question', e.target.value)}
                    rows={2}
                    className="question-input"
                    placeholder={`Enter question...`}
                  />
                </div>
                <button
                  className="remove-question-btn"
                  onClick={() => removeQuestion(idx)}
                  title="Remove question"
                  style={{ alignSelf: 'flex-start', marginTop: '24px' }}
                >
                  <i className="bi bi-trash"></i>
                </button>
              </div>
              <div className="ground-truth-item" style={{ marginTop: '8px', paddingLeft: '0' }}>
                <label className="setting-label" style={{ fontSize: '12px', marginBottom: '4px', color: 'var(--primary)' }}>Ground Truth (Optional)</label>
                <textarea
                  value={qObj.ground_truth}
                  onChange={(e) => updateQuestion(idx, 'ground_truth', e.target.value)}
                  rows={2}
                  className="question-input"
                  style={{ borderColor: 'var(--border)', background: '#f8fafc' }}
                  placeholder={`Enter expected answer for validation...`}
                />
              </div>
              <hr style={{ margin: '1.5rem 0', border: '0', borderTop: '1px dashed var(--border)' }} />
            </div>
          ))}
          <button className="ragas-btn btn-secondary-ragas" onClick={addQuestion}>
            <i className="bi bi-plus-lg"></i> Add Question
          </button>
        </div>
      </div>

      <div className="config-card">
        <h2><i className="bi bi-gear"></i> Evaluation Settings</h2>
        <div className="settings-group">
          <div className="setting-item">
            <label className="setting-label">LLM Model</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="setting-select"
            >
              <option value="gpt-4o-mini">gpt-4o-mini</option>
              <option value="gpt-4o">gpt-4o</option>
              <option value="claude-3.5-sonnet">claude-3.5-sonnet</option>
              <option value="hf-mistral">HuggingFace Mistral</option>
            </select>
          </div>

          <div className="setting-item">
            <label className="setting-label">Top K (Context retrieved)</label>
            <input
              type="number"
              min="1"
              max="10"
              value={topK}
              onChange={(e) => setTopK(Number(e.target.value))}
              className="setting-input"
            />
          </div>
        </div>

        <div className="action-buttons">
          <button
            onClick={() => navigate("/?tab=ragas")}
            className="ragas-btn btn-secondary-ragas"
          >
            <i className="bi bi-arrow-left"></i> Back to Ragas Tab
          </button>

          <button
            onClick={saveConfig}
            className="ragas-btn btn-success-ragas"
            disabled={isLoading}
          >
            <i className="bi bi-save"></i> Save Configuration
          </button>
        </div>
      </div>

      {showQuestionsModal && (
        <div className="loading-overlay" onClick={() => setShowQuestionsModal(false)}>
          <div className="config-card" style={{ maxWidth: '600px', width: '90%', maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3>Saved Questions</h3>
              <button
                onClick={() => setShowQuestionsModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            {questions && questions.length > 0 ? (
              <ol style={{ paddingLeft: '20px' }}>
                {questions.map((qObj, index) => (
                  <li key={index} className="mt-2 text-sm">
                    {qObj.question || <span style={{ color: '#999' }}>Empty question</span>}
                  </li>
                ))}
              </ol>
            ) : (
              <p style={{ textAlign: 'center', color: '#666' }}>No questions saved yet.</p>
            )}

            <div className="mt-4 flex justify-end">
              <button className="ragas-btn btn-primary-ragas" onClick={() => setShowQuestionsModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
