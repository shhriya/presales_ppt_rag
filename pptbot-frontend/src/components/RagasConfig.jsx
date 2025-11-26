import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
 
const BASE = "http://127.0.0.1:9000";
 
export default function RagasConfig() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
 
  // STATES
  const sessionId = "0000000000";
  const [questions, setQuestions] = useState([""]);
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [model, setModel] = useState("gpt-4o-mini");
  const [topK, setTopK] = useState(3);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showQuestionsModal, setShowQuestionsModal] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
 
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
          setQuestions(config.questions.length > 0 ? config.questions : ['']);
        }
       
        if (config.model) {
          setModel(config.model);
        }
       
        if (config.top_k) {
          setTopK(Number(config.top_k) || 3);
        }
       
        if (config.file_name) {
          setFilePreview(config.file_name);
          setFileUrl(`${BASE}/files/${sessionId}_${encodeURIComponent(config.file_name)}`);
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
        const currentSessionId = sessionId;
       
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
  }, [loadConfigFromServer, isInitialized]);
 
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
    setQuestions([...questions, ""]);
  }
 
  // REMOVE QUESTION
  function removeQuestion(index) {
    const updated = [...questions];
    updated.splice(index, 1);
    if (updated.length === 0) updated.push("");
    setQuestions(updated);
  }
 
  // UPDATE QUESTION TEXT
  function updateQuestion(index, value) {
    const updated = [...questions];
    updated[index] = value;
    setQuestions(updated);
  }
 
  // Navigate to evaluation page
  const goToEvaluation = () => {
    if (!sessionId) {
      setError('No active session. Please save your configuration first.');
      return;
    }
    navigate(`/ragas/evaluation?session_id=${sessionId}`);
  };
 
  // Run evaluation directly from config page
  const runEvaluation = async () => {
    if (!sessionId) {
      setError('Please save your configuration first.');
      return;
    }
   
    try {
      setIsLoading(true);
      setError(null);
     
      const formData = new FormData();
      formData.append('question', 'Evaluate RAG system performance');
      formData.append('session_id', sessionId);
     
      const response = await fetch(`${BASE}/api/ragas/run`, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
          ...(user?.user_id && { 'X-User-Id': String(user.user_id) })
        },
        credentials: 'include'
      });
     
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }
     
      // Show success message
      setError('Evaluation completed successfully!');
     
      // Navigate to evaluation page to see results
      setTimeout(() => navigate(`/ragas/evaluation?session_id=${sessionId}`), 1000);
     
    } catch (err) {
      console.error('Evaluation failed:', err);
      setError(err.message || 'Failed to run evaluation');
    } finally {
      setIsLoading(false);
    }
  };
 
  // SAVE CONFIG
  const saveConfig = async () => {
    if (!sessionId) {
      setError('No active session. Please refresh the page and try again.');
      return;
    }
 
    const formData = new FormData();
   
    // Add file if it exists
    if (file) {
      formData.append('file', file);
     
      // Store file info in localStorage for persistence
      const fileInfo = {
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified
      };
      localStorage.setItem('ragasFileInfo', JSON.stringify(fileInfo));
    } else if (filePreview) {
      // If we have a file preview but no file object, it means the file was already uploaded
      formData.append('file_name', filePreview);
    }
   
    // Add questions (ensure at least one empty question)
    const questionsToSave = questions.length > 0 ? questions : [''];
    formData.append('questions', JSON.stringify(questionsToSave));
   
    // Add other configuration
    formData.append('model', model);
    formData.append('top_k', topK.toString());
   
    try {
      setIsLoading(true);
      setError(null);
     
      // Save to server
      const response = await fetch(`${BASE}/api/ragas/config?session_id=${sessionId}`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers: {
          ...(user?.user_id && { 'X-User-Id': String(user.user_id) }),
          'X-Session-Id': sessionId
        },
      });
     
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to save configuration');
      }
     
      const result = await response.json();
     
      // Update local state with saved data
      if (result.config) {
        const { questions: savedQuestions, model: savedModel, top_k: savedTopK, file_name } = result.config;
       
        if (savedQuestions) {
          setQuestions(Array.isArray(savedQuestions) ? savedQuestions : [savedQuestions]);
        }
       
        if (savedModel) {
          setModel(savedModel);
        }
       
        if (savedTopK) {
          setTopK(Number(savedTopK) || 3);
        }
       
        if (file_name) {
          setFilePreview(file_name);
          setFileUrl(`${BASE}/api/files/${encodeURIComponent(file_name)}`);
         
          // Update file in state if needed
          if (file?.name !== file_name) {
            const fileInfo = {
              name: file_name,
              type: 'application/octet-stream',
              size: 0,
              lastModified: Date.now()
            };
            const newFile = new File([], file_name, {
              type: 'application/octet-stream',
              lastModified: fileInfo.lastModified
            });
            setFile(newFile);
          }
        }
      }
     
      // Show success message
      alert('Configuration saved successfully!');
      return result;
     
    } catch (error) {
      console.error('Error saving configuration:', error);
      setError(error.message || 'Failed to save configuration');
      alert(`Failed to save configuration: ${error.message || 'Unknown error'}`);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
 
  return (
    <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 25 }}>
      <h1>RAGAS Evaluation Configuration</h1>
 
      {/* FILE UPLOAD */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Upload Document</label>
          <div className="mt-1 flex items-center">
            <input
              type="file"
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
          {filePreview && (
            <div className="mt-2 flex items-center">
              <span className="text-sm text-gray-700">Selected: {filePreview}</span>
              {fileUrl && (
                <button
                  onClick={() => window.open(fileUrl, '_blank')}
                  className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                  title="Open file"
                >
                  Open File
                </button>
              )}
            </div>
          )}
        </div>
 
        {/* QUESTION SET */}
        <div>
          <strong>Question Set</strong>
          {questions.map((q, idx) => (
            <div key={idx} style={{ display: "flex", gap: 10, marginBottom: 10 }}>
              <textarea
                value={q}
                onChange={(e) => updateQuestion(idx, e.target.value)}
                rows={2}
                style={{ flex: 1, padding: 8 }}
                placeholder={`Question ${idx + 1}`}
              />
              <button onClick={() => removeQuestion(idx)} style={{ background: "#e85b5b", color: "white" }}>
                X
              </button>
            </div>
          ))}
          <button onClick={addQuestion}>+ Add Question</button>
        </div>
 
        {/* SETTINGS */}
        <div>
          <strong>Evaluation Settings</strong>
          <div style={{ marginTop: 10, marginBottom: 20 }}>
            <label>Model: </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              style={{ marginLeft: 10, padding: '5px' }}
            >
              <option value="gpt-4o-mini">gpt-4o-mini</option>
              <option value="gpt-4o">gpt-4o</option>
              <option value="claude-3.5-sonnet">claude-3.5-sonnet</option>
              <option value="hf-mistral">huggingface mistral</option>
            </select>
          </div>
         
          <div style={{ marginTop: 10, marginBottom: 20 }}>
            <label>Top K: </label>
            <input
              type="number"
              min="1"
              max="10"
              value={topK}
              onChange={(e) => setTopK(Number(e.target.value))}
              style={{ marginRight: '10px' }}
            />
            <button
  onClick={async () => {
    try {
      setIsLoading(true);
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
      const data = await res.json();
      if (!res.ok) throw new Error("Failed to save config");
      setQuestions(data.config.questions);
      setModel(data.config.model);
      setTopK(data.config.top_k);
      if (data.config.file_name) setFilePreview(data.config.file_name);
      alert("Configuration saved successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to save configuration: " + err.message);
    } finally {
      setIsLoading(false);
    }
  }}
  style={{ padding: "10px 20px", background: "#4CAF50", color: "white", border: "none", borderRadius: 5 }}
>
  Save Configuration
</button>
 
            <button
              onClick={() => navigate("/ragas")}
              style={{
                padding: '10px 20px',
                background: '#999',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer'
              }}
            >
              Back
            </button>
          </div>
        </div>
      </div>
 
      {/* Questions Modal */}
      {showQuestionsModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            width: '80%',
            maxWidth: '600px',
            maxHeight: '80vh',
            overflowY: 'auto',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              borderBottom: '1px solid #eee',
              paddingBottom: '10px'
            }}>
              <h3>Saved Questions</h3>
              <button
                onClick={() => setShowQuestionsModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#666'
                }}
              >
                &times;
              </button>
            </div>
           
            {questions && questions.length > 0 ? (
              <ol style={{
                paddingLeft: '20px',
                margin: 0
              }}>
                {questions.map((question, index) => (
                  <li key={index} style={{
                    marginBottom: '10px',
                    padding: '10px',
                    backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white',
                    borderRadius: '4px'
                  }}>
                    {question || <span style={{ color: '#999' }}>Empty question</span>}
                  </li>
                ))}
              </ol>
            ) : (
              <p style={{ color: '#666', textAlign: 'center' }}>No questions saved yet.</p>
            )}
           
            <div style={{
              marginTop: '20px',
              textAlign: 'right',
              borderTop: '1px solid #eee',
              paddingTop: '15px'
            }}>
              <button
                onClick={() => setShowQuestionsModal(false)}
                style={{
                  padding: '8px 16px',
                  background: '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}