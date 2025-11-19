// src/components/groups/GroupsFileViewer.jsx

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { BASE_URL } from "../api/api";
import "./GroupsFileViewer.css";

// Helper function for authentication headers
function authHeaders() {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return {};
    const { token } = JSON.parse(raw);
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

export default function GroupsFileViewer() {
  const { groupId, fileId, filename } = useParams();
  const navigate = useNavigate();
  const [viewerUrl, setViewerUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [convertingToPdf, setConvertingToPdf] = useState(false);
  const [conversionError, setConversionError] = useState(null);
  const [fileData, setFileData] = useState(null);

  // Supported file type groups (same as FilePreviewModal)
  const fileTypes = {
    image: ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "tiff", "tif", "ico", "heic", "heif"],
    pdf: ["pdf"],
    office: ["pptx", "ppt", "docx", "doc", "xlsx", "xls", "odt", "odp", "ods"],
    text: ["txt", "csv", "md", "markdown", "log", "rtf", "xml", "json", "yaml", "yml", "ini", "conf", "cfg"],
    code: ["js", "jsx", "ts", "tsx", "py", "java", "c", "cpp", "cs", "php", "rb", "go", "rs", "swift", "kt", "dart"],
    audio: ["mp3", "wav", "ogg", "m4a", "flac", "aac", "wma", "opus", "weba"],
    video: ["mp4", "mov", "webm", "avi", "mkv", "wmv", "flv", "ogv", "3gp", "m4v"],
    archive: ["zip", "rar", "7z", "tar", "gz", "bz2", "xz", "iso"],
  };

  // Function to handle PDF conversion for Office docs
  const convertToPdf = async (fileId, fileName) => {
    const fileExt = fileName.split('.').pop()?.toLowerCase() || '';
    if (!['pptx', 'ppt', 'docx', 'doc'].includes(fileExt)) {
      return null;
    }

    setConvertingToPdf(true);
    setConversionError(null);

    try {
      const pdfUrl = `${BASE_URL}/files/${fileId}/as-pdf`;
      const response = await fetch(pdfUrl, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to convert to PDF: ${response.statusText}`);
      }

      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error('Error converting to PDF:', error);
      setConversionError('Failed to convert document to PDF. Please try downloading the file instead.');
      return null;
    } finally {
      setConvertingToPdf(false);
    }
  };

  // Load file with the same logic as FilePreviewModal
  useEffect(() => {
    let isMounted = true;
    let objectUrl = null;

    async function init() {
      if (!fileId || !filename) {
        setError("No file ID or filename provided");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        // Create file data object from route parameters
        const fileObj = {
          file_id: fileId,
          filename: filename
        };
        setFileData(fileObj);

        const fileExt = filename.split('.').pop()?.toLowerCase() || '';

        console.log("🔍 File object:", fileObj);
        console.log("🛠️ Base preview URL:", `${BASE_URL}/files/${fileId}`);

        let previewUrl = `${BASE_URL}/files/${fileId}`;

        if (fileExt === 'pdf') {
          // For PDFs, use the built-in browser PDF viewer
          previewUrl += `#page=1&t=${Date.now()}`;
          setViewerUrl(previewUrl);
        } else if (['pptx', 'ppt', 'docx', 'doc'].includes(fileExt)) {
          // For Office docs, convert to PDF first
          const pdfUrl = await convertToPdf(fileId, filename);
          if (pdfUrl && isMounted) {
            setViewerUrl(pdfUrl);
          } else if (isMounted) {
            // If conversion fails, fall back to direct download
            setViewerUrl(previewUrl);
            setError(conversionError || 'Preview not available. Please download the file to view it.');
          }
        } else {
          // For other file types, use direct URL with timestamp
          setViewerUrl(`${previewUrl}?t=${Date.now()}`);
        }
      } catch (e) {
        console.error("Error loading file:", e);
        if (isMounted) {
          setError(`Failed to load file: ${e.message || 'Unknown error'}`);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    init();

    // Cleanup function
    return () => {
      isMounted = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [fileId, filename]);

  if (!fileData) return null;

  const ext = fileData.filename.split('.').pop()?.toLowerCase() || '';

  // Check file type against our groups
  const isImage = fileTypes.image.includes(ext);
  const isPdf = fileTypes.pdf.includes(ext);
  const isOffice = fileTypes.office.includes(ext);
  const isTextLike = [...fileTypes.text, ...fileTypes.code].includes(ext);
  const isAudio = fileTypes.audio.includes(ext);
  const isVideo = fileTypes.video.includes(ext);

  const handleClose = () => {
    navigate(`/?tab=groups&group=${groupId}`);
  };

  return (
    <div className="group-file-viewer-container">
      <div className="viewer-header">
        <button 
          className="back-btn" 
          onClick={handleClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'white',
            fontSize: '16px',
            cursor: 'pointer',
            marginRight: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}
        >
          ← Back to Groups
        </button>
        <span className="viewer-title">{fileData.filename}</span>
        <button className="close-btn" onClick={handleClose}>×</button>
      </div>

      <div className="viewer-content">
        {loading ? (
          <div className="loading-indicator" style={{
            padding: '24px',
            textAlign: 'center',
            color: '#666',
            fontSize: '16px',
            maxWidth: '400px',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div className="spinner" style={{
              width: '40px',
              height: '40px',
              border: '4px solid rgba(0, 0, 0, 0.1)',
              borderRadius: '50%',
              borderTopColor: '#2563eb',
              animation: 'spin 1s ease-in-out infinite'
            }}></div>
            <div>Preparing your file...</div>
            <div style={{ fontSize: '14px', opacity: 0.8 }}>{fileData.filename}</div>
          </div>
        ) : error ? (
          <div className="error-message" style={{
            padding: '20px',
            textAlign: 'center',
            color: '#dc2626',
            backgroundColor: '#fef2f2',
            borderRadius: '8px',
            border: '1px solid #fecaca',
            maxWidth: '500px',
            margin: '0 auto'
          }}>
            {error}
          </div>
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start'
          }}>
            {isImage && (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                width: '100%',
                height: '100%',
                padding: '20px'
              }}>
                <img
                  src={viewerUrl}
                  alt={fileData.filename || 'Image preview'}
                  style={{
                    maxWidth: '100%',
                    maxHeight: 'calc(100vh - 120px)',
                    objectFit: 'contain',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    backgroundColor: '#fff',
                    padding: '10px'
                  }}
                  onError={(e) => {
                    console.error('Image load error:', e);
                    setError("Unable to display this image. The file may be corrupted or in an unsupported format.");
                  }}
                />
              </div>
            )}

            {(isPdf || isOffice) && (
              <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '20px',
                overflow: 'auto'
              }}>
                {convertingToPdf ? (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    color: '#666'
                  }}>
                    <div className="spinner" style={{
                      width: '40px',
                      height: '40px',
                      border: '4px solid rgba(0, 0, 0, 0.1)',
                      borderRadius: '50%',
                      borderTopColor: '#2563eb',
                      animation: 'spin 1s ease-in-out infinite',
                      marginBottom: '16px'
                    }}></div>
                    <div>Converting {ext.toUpperCase()} to PDF for better viewing...</div>
                  </div>
                ) : conversionError ? (
                  <div style={{
                    width: '100%',
                    maxWidth: '600px',
                    padding: '24px',
                    backgroundColor: '#fff',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                    textAlign: 'center'
                  }}>
                    <p style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '500' }}>
                      {conversionError}
                    </p>
                    <button
                      onClick={() => window.open(`${BASE_URL}/api/files/${fileData.file_id}/download`, '_blank')}
                      style={{
                        background: '#2563eb',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '8px 16px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '14px',
                        margin: '0 auto'
                      }}
                    >
                      Download Original File
                    </button>
                  </div>
                ) : (
                  <div style={{
                    width: '100%',
                    maxWidth: '900px',
                    height: '100%',
                    minHeight: '600px',
                    backgroundColor: '#fff',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                    <iframe
                      title={`${fileData.filename} - Document Preview`}
                      src={viewerUrl}
                      style={{
                        flex: 1,
                        width: '100%',
                        border: 'none',
                        backgroundColor: '#fff'
                      }}
                      onError={(e) => {
                        console.error('Document load error:', e);
                        setError(`Unable to display this ${ext.toUpperCase()} file. The file may be corrupted or in an unsupported format.`);
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {isTextLike && (
              <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                justifyContent: 'center',
                padding: '20px',
                backgroundColor: '#f8f9fa',
                overflow: 'auto'
              }}>
                <pre style={{
                  width: '100%',
                  maxWidth: '900px',
                  minHeight: '200px',
                  maxHeight: 'calc(100vh - 140px)',
                  margin: 0,
                  padding: '20px',
                  backgroundColor: '#fff',
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                  overflow: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontFamily: 'monospace',
                  fontSize: '14px',
                  lineHeight: '1.5',
                  color: '#333',
                  textAlign: 'left'
                }}>
                  {error ? `Error: ${error}` : (
                    <iframe
                      title="text-preview"
                      src={viewerUrl}
                      style={{
                        width: '100%',
                        height: '100%',
                        border: 'none',
                        backgroundColor: 'transparent'
                      }}
                      onError={(e) => {
                        console.error('Text load error:', e);
                        setError("Unable to display this text file. The file may be too large or in an unsupported format.");
                      }}
                    />
                  )}
                </pre>
              </div>
            )}

            {isAudio && (
              <div style={{
                width: '100%',
                maxWidth: '600px',
                padding: '24px',
                backgroundColor: '#fff',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
              }}>
                <audio
                  controls
                  src={viewerUrl}
                  style={{
                    width: '100%',
                    outline: 'none'
                  }}
                  onError={() => setError("Failed to load audio file")}
                >
                  Your browser does not support the audio element.
                </audio>
              </div>
            )}

            {isVideo && (
              <video
                controls
                src={viewerUrl}
                style={{
                  maxWidth: '100%',
                  maxHeight: 'calc(100vh - 100px)',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                }}
                onError={() => setError("Failed to load video file")}
              >
                Your browser does not support the video element.
              </video>
            )}

            {!isImage && !isPdf && !isOffice && !isTextLike && !isAudio && !isVideo && (
              <div style={{
                padding: '32px',
                textAlign: 'center',
                backgroundColor: '#fff',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
              }}>
                <p style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '500' }}>
                  Preview not available for this file type.
                </p>
                <p style={{ marginBottom: '16px', color: '#6b7280' }}>
                  File type: {ext || 'unknown'}
                </p>
                <button
                  onClick={() => window.open(`${BASE_URL}/api/files/${fileData.file_id}/download`, '_blank')}
                  style={{
                    background: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '8px 16px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px',
                    margin: '0 auto'
                  }}
                >
                  Download File
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
