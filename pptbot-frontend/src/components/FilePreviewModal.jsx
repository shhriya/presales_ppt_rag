import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BASE_URL } from '../api/api';
import './FilePreviewModal.css';

export default function FilePreviewModal({ fileId, onClose }) {
  const [url, setUrl] = useState("");
  const [type, setType] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [fileName, setFileName] = useState("");
  const navigate = useNavigate();

  const [convertingToPdf, setConvertingToPdf] = useState(false);
  const [conversionError, setConversionError] = useState(null);

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

  useEffect(() => {
    let isMounted = true;
    let objectUrl = null;

    async function init() {
      if (!fileId) {
        setError("No file ID provided");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError("");
        
        // Extract filename from fileId if it contains the original filename
        const fileNameFromId = fileId.split('_').pop();
        setFileName(fileNameFromId);
        
        // Get file extension
        const fileExt = fileNameFromId.split('.').pop()?.toLowerCase() || '';
        setType(fileExt);

        // Build the appropriate URL based on file type
        let previewUrl = `${BASE_URL}/files/${fileId}`;
        
        if (fileExt === 'pdf') {
          // For PDFs, we can use the built-in browser PDF viewer
          previewUrl += `#page=1&t=${Date.now()}`; // Add timestamp to prevent caching
          setUrl(previewUrl);
        } else if (['pptx', 'ppt', 'docx', 'doc'].includes(fileExt)) {
          // For Office docs, convert to PDF first
          const pdfUrl = await convertToPdf(fileId, fileNameFromId);
          if (pdfUrl && isMounted) {
            setUrl(pdfUrl);
          } else if (isMounted) {
            // If conversion fails, fall back to direct download
            setUrl(previewUrl);
            setError(conversionError || 'Preview not available. Please download the file to view it.');
          }
        } else {
          // For other file types, use direct URL
          setUrl(`${previewUrl}?t=${Date.now()}`);
        }
      } catch (e) {
        console.error("Error loading file:", e);
        if (isMounted) {
          setError(`Failed to load file: ${e.message || 'Unknown error'}`);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
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
  }, [fileId]);

  const handleDownload = () => {
    if (!fileId) {
      setError("No file ID available for download");
      return;
    }
    
    // Create a temporary link element
    const link = document.createElement('a');
    const downloadUrl = `${BASE_URL}/files/${fileId}/download`;
    
    // Set the download attribute with a filename if available
    if (fileName) {
      link.download = fileName;
    }
    
    link.href = downloadUrl;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBack = () => {
    if (onClose) {
      onClose();
    } else if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/chat');
    }
  };

  // File type detection with fallbacks
  const fileType = type.toLowerCase();
  
  // Supported file type groups
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

  // Check file type against our groups
  const isImage = fileTypes.image.includes(fileType);
  const isPdf = fileTypes.pdf.includes(fileType);
  const isOffice = fileTypes.office.includes(fileType);
  const isTextLike = [...fileTypes.text, ...fileTypes.code].includes(fileType);
  const isAudio = fileTypes.audio.includes(fileType);
  const isVideo = fileTypes.video.includes(fileType);
  const isArchive = fileTypes.archive.includes(fileType);
  
  // Get the appropriate viewer URL based on file type
  const getViewerUrl = (fileId, fileExt) => {
    const baseUrl = `${BASE_URL}/files/${fileId}`;
    
    // For Office files, use the PDF conversion endpoint if available
    if (fileTypes.office.includes(fileExt)) {
      return `${baseUrl}/as-pdf`;
    }
    
    // For text and code files, add a timestamp to prevent caching issues
    if ([...fileTypes.text, ...fileTypes.code].includes(fileExt)) {
      return `${baseUrl}?t=${Date.now()}`;
    }
    
    // For PDFs, add page parameter
    if (fileExt === 'pdf') {
      return `${baseUrl}#page=1`;
    }
    
    // For all other files, return the direct URL
    return baseUrl;
  };
  // Removed unused showIframe variable

  // If we're in a new tab, add some basic styling
  // Set full screen styles when component mounts
  useEffect(() => {
    const originalStyles = {
      margin: document.body.style.margin,
      padding: document.body.style.padding,
      overflow: document.body.style.overflow,
    };
    
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.overflow = 'hidden';
    
    return () => {
      // Restore original styles when component unmounts
      document.body.style.margin = originalStyles.margin;
      document.body.style.padding = originalStyles.padding;
      document.body.style.overflow = originalStyles.overflow;
    };
  }, []);

  return (
    <div className="file-preview-modal">
      <div className="file-preview-header">
        <button 
          className="back-button"
          onClick={handleBack}
        >
          <i className="bi bi-arrow-left"></i> Back to Chat
        </button>
        <div className="file-title">{fileName || 'File Preview'}</div>
        <button 
          className="download-button" 
          onClick={handleDownload}
        >
          <i className="bi bi-download"></i> Download
        </button>
      </div>
      
      <div className="file-preview-content">
        {isLoading ? (
          <div className="loading-indicator" style={{
            padding: '24px',
            textAlign: 'center',
            color: '#fff',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            borderRadius: '8px',
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
              border: '4px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '50%',
              borderTopColor: '#fff',
              animation: 'spin 1s ease-in-out infinite',
              '@keyframes spin': {
                'to': { transform: 'rotate(360deg)' }
              }
            }}></div>
            <div>Preparing your file...</div>
            <div style={{ fontSize: '14px', opacity: 0.8 }}>{fileName}</div>
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
                  src={`${url}?t=${Date.now()}`} 
                  alt={fileName || 'Image preview'} 
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
                    color: '#fff'
                  }}>
                    <div className="spinner" style={{
                      width: '40px',
                      height: '40px',
                      border: '4px solid rgba(255, 255, 255, 0.3)',
                      borderRadius: '50%',
                      borderTopColor: '#fff',
                      animation: 'spin 1s ease-in-out infinite',
                      marginBottom: '16px'
                    }}></div>
                    <div>Converting {fileType.toUpperCase()} to PDF for better viewing...</div>
                  </div>
                ) : conversionError ? (
                  <div style={{
                    backgroundColor: 'rgba(254, 226, 226, 0.2)',
                    borderLeft: '4px solid #f87171',
                    padding: '16px',
                    margin: '16px 0',
                    borderRadius: '4px',
                    color: '#fff',
                    maxWidth: '600px',
                    width: '100%'
                  }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Conversion Failed</div>
                    <div style={{ marginBottom: '12px' }}>{conversionError}</div>
                    <button
                      onClick={handleDownload}
                      style={{
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '8px 16px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '14px'
                      }}
                    >
                      <i className="bi bi-download"></i>
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
                      title={`${fileName} - Document Preview`}
                      src={url}
                      style={{
                        flex: 1,
                        width: '100%',
                        border: 'none',
                        backgroundColor: '#fff'
                      }}
                      onError={(e) => {
                        console.error('Document load error:', e);
                        setError(`Unable to display this ${fileType.toUpperCase()} file. The file may be corrupted or in an unsupported format.`);
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
                  {isLoading ? 'Loading file content...' : ''}
                  {error ? `Error: ${error}` : (
                    <iframe
                      title="text-preview"
                      src={getViewerUrl(fileId, fileType)}
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
                  src={url} 
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
                src={url} 
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
                <p style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '500' }}>Preview not available for this file type.</p>
                <p style={{ marginBottom: '16px', color: '#6b7280' }}>File type: {type || 'unknown'}</p>
                <button
                  onClick={handleBack}
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    borderRadius: '4px',
                    padding: '6px 12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#334155',
                    transition: 'all 0.2s',
                    ':hover': {
                      backgroundColor: '#e2e8f0',
                      borderColor: '#cbd5e1'
                    }
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginTop: '1px' }}>
                    <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="currentColor"/>
                  </svg>
                  Back to Chat
                </button>
                <button 
                  onClick={handleDownload}
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
                    fontSize: '14px'
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 16L7 11L8.41 9.58L11 12.17V4H13V12.17L15.59 9.58L17 11L12 16Z" fill="currentColor"/>
                    <path d="M20 18H4V20H20V18Z" fill="currentColor"/>
                  </svg>
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
