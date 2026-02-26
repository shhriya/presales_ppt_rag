// src/components/RagasFileViewer.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { BASE_URL } from '../api/api';
import './RagasFileViewer.css';
function authHeaders() {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return {};
    const { token } = JSON.parse(raw);
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}
// ... (existing imports)

export default function RagasFileViewer({ fileId, fileName, fileUrl, onClose, showClose = true, showDownload = true }) {
  const [viewerUrl, setViewerUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [convertingToPdf, setConvertingToPdf] = useState(false);
  const [conversionError, setConversionError] = useState(null);
  const [fileData, setFileData] = useState(null);

  // File type groups
  const fileTypes = {
    image: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'tiff', 'tif', 'ico', 'heic', 'heif'],
    pdf: ['pdf'],
    office: ['pptx', 'ppt', 'docx', 'doc', 'xlsx', 'xls', 'odt', 'odp', 'ods'],
    text: ['txt', 'csv', 'md', 'markdown', 'log', 'rtf', 'xml', 'json', 'yaml', 'yml', 'ini', 'conf', 'cfg'],
    code: ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp', 'cs', 'php', 'rb', 'go', 'rs', 'swift', 'kt', 'dart'],
    audio: ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'wma', 'opus', 'weba'],
    video: ['mp4', 'mov', 'webm', 'avi', 'mkv', 'wmv', 'flv', 'ogv', '3gp', 'm4v'],
    archive: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'iso'],
  };

  // Get file extension
  const getFileExtension = (filename) => {
    return filename?.split('.').pop()?.toLowerCase() || '';
  };

  // Convert Office docs to PDF
  const convertToPdf = useCallback(async (fileId, fileName) => {
    const fileExt = getFileExtension(fileName);
    if (!['pptx', 'ppt', 'docx', 'doc'].includes(fileExt)) return null;

    setConvertingToPdf(true);
    setConversionError(null);

    try {
      console.log('Converting to PDF - File ID:', fileId);
      const pdfUrl = getFileUrl(fileId, 'as-pdf');
      console.log('PDF Conversion URL:', pdfUrl);

      const response = await fetch(pdfUrl, {
        headers: {
          ...authHeaders(),
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        credentials: 'include',
        mode: 'cors'
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('PDF conversion failed:', response.status, errorText);
        throw new Error(`Failed to convert to PDF: ${response.statusText}`);
      }

      const blob = await response.blob();
      if (!blob || blob.size === 0) {
        throw new Error('Received empty PDF blob from server');
      }

      const objectUrl = URL.createObjectURL(blob);
      console.log('Successfully created object URL for PDF');
      return objectUrl;
    } catch (err) {
      console.error('Error in convertToPdf:', err);
      setConversionError('Failed to convert document to PDF. Please try downloading the file instead.');
      throw err; // Re-throw to allow error handling in the calling function
    } finally {
      setConvertingToPdf(false);
    }
  }, []);

  // Handle file download
  const handleDownload = useCallback(() => {
    if (!fileId && !fileUrl) {
      setError("No file available for download");
      return;
    }

    const link = document.createElement('a');
    let downloadUrl = fileUrl || getFileUrl(fileId, 'download');

    console.log('Preparing download for URL:', downloadUrl);

    // Set the download attribute with the correct filename
    const downloadName = fileName || fileData?.filename || 'download';
    link.download = downloadName.includes('.') ? downloadName : `${downloadName}.${getFileExtension(downloadName) || 'bin'}`;

    // Open in new tab for better user experience
    link.href = downloadUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';

    // Add to document, trigger click, and clean up
    document.body.appendChild(link);
    link.click();

    // Clean up after a short delay to ensure the download starts
    setTimeout(() => {
      document.body.removeChild(link);
    }, 100);
  }, [fileId, fileUrl, fileName, fileData]);

  // Function to get file URL with authentication
  const getFileUrl = (fileId, action = '') => {
    const url = `${BASE_URL}/files/${fileId}${action ? `/${action}` : ''}`;
    const authToken = authHeaders().Authorization?.replace('Bearer ', '');
    const separator = url.includes('?') ? '&' : '?';
    const timestamp = `t=${Date.now()}`;
    const authParam = authToken ? `&token=${encodeURIComponent(authToken)}` : '';

    return `${url}${separator}${timestamp}${authParam}`;
  };

  // Initialize file preview
  const initFilePreview = useCallback(async () => {
    console.log('initFilePreview called with:', { fileId, fileUrl, fileName });

    if (!fileId && !fileUrl) {
      const errMsg = 'No file ID or URL provided';
      console.error(errMsg);
      setError(errMsg);
      setLoading(false);
      return;
    }

    let isMounted = true;
    let objectUrl = null;

    const cleanup = () => {
      if (objectUrl) {
        try {
          console.log('Cleaning up object URL');
          URL.revokeObjectURL(objectUrl);
        } catch (e) {
          console.error('Error revoking object URL:', e);
        }
      }
    };

    try {
      setLoading(true);
      setError('');
      setConversionError(null);

      const fileObj = {
        file_id: fileId,
        filename: fileName || 'document',
        url: fileUrl
      };
      setFileData(fileObj);

      const fileExt = getFileExtension(fileName || '').toLowerCase();
      console.log('File extension:', fileExt);

      // For blob URLs (local files)
      if (fileUrl && fileUrl.startsWith('blob:')) {
        console.log('Handling local file (blob URL)');
        setViewerUrl(fileUrl);
        setLoading(false);
        return;
      }

      // For remote files
      if (fileId) {
        // Handle PDFs
        if (fileExt === 'pdf') {
          const pdfUrl = getFileUrl(fileId);
          console.log('Loading PDF:', pdfUrl);
          setViewerUrl(pdfUrl);
          setLoading(false);
          return;
        }

        // Handle Office docs - convert to PDF
        if (['pptx', 'ppt', 'docx', 'doc'].includes(fileExt)) {
          try {
            console.log('Converting Office document to PDF...');
            const pdfUrl = await convertToPdf(fileId, fileName || 'document');
            if (pdfUrl && isMounted) {
              console.log('PDF conversion successful, setting viewer URL');
              objectUrl = pdfUrl;
              setViewerUrl(pdfUrl);
              setLoading(false);
              return;
            } else {
              throw new Error('PDF conversion returned no URL');
            }
          } catch (e) {
            console.error('PDF conversion failed:', e);
            // Fallback to direct download if conversion fails
            const directUrl = getFileUrl(fileId, 'download');
            console.log('Falling back to direct download URL:', directUrl);
            setViewerUrl(directUrl);
            setError('Failed to convert document to PDF. Showing download link instead.');
            return;
          }
        }

        // For other supported file types (images, audio, video, text, code)
        if (
          fileTypes.image.includes(fileExt) ||
          fileTypes.audio.includes(fileExt) ||
          fileTypes.video.includes(fileExt) ||
          fileTypes.text.includes(fileExt) ||
          fileTypes.code.includes(fileExt)
        ) {
          const mediaUrl = getFileUrl(fileId);
          console.log('Loading media file:', mediaUrl);
          setViewerUrl(mediaUrl);
          setLoading(false);
          return;
        }

        // For unsupported types, provide download link
        const downloadUrl = getFileUrl(fileId, 'download');
        console.log('Unsupported file type, using download URL:', downloadUrl);
        setViewerUrl(downloadUrl);
        setError('Preview not available for this file type. Please download the file to view it.');
      }
    } catch (e) {
      const errMsg = `Error loading file: ${e.message || 'Unknown error'}`;
      console.error(errMsg, e);
      if (isMounted) {
        setError(errMsg);
      }
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }

    return () => {
      isMounted = false;
      cleanup();
    };
  }, [fileId, fileUrl, fileName, fileTypes, convertToPdf]);

  // Initialize the file preview when the component mounts or when dependencies change
  useEffect(() => {
    initFilePreview();
  }, [initFilePreview]);

  if (!fileData && !fileUrl) return null;

  const ext = fileData?.filename ? getFileExtension(fileData.filename) : (fileName ? getFileExtension(fileName) : '');
  const isImage = ext && fileTypes.image.includes(ext);
  const isPdf = ext && fileTypes.pdf.includes(ext);
  const isOffice = ext && fileTypes.office.includes(ext);
  const isTextLike = ext && [...fileTypes.text, ...fileTypes.code].includes(ext);
  const isAudio = ext && fileTypes.audio.includes(ext);
  const isVideo = ext && fileTypes.video.includes(ext);
  const displayName = fileData?.filename || fileName || 'document';

  const handleBack = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="ragas-file-preview">
      <div className="ragas-file-preview-header">
        <button onClick={handleBack} className="ragas-back-button">&larr; Back</button>
        <div className="ragas-file-name" title={displayName}>
          {displayName}
        </div>
        <div className="ragas-file-actions">
          {showDownload && (
            <button 
              onClick={handleDownload} 
              className="ragas-download-button"
              disabled={loading || convertingToPdf}
            >
              {convertingToPdf ? 'Converting...' : 'Download'}
            </button>
          )}
          {showClose && (
            <button 
              onClick={onClose || handleBack} 
              className="ragas-close-button"
              disabled={loading || convertingToPdf}
            >
              &times;
            </button>
          )}
        </div>
      </div>

      <div className="ragas-file-preview-content">
        {loading || convertingToPdf ? (
          <div className="ragas-file-loading">
            <div className="ragas-loading-spinner" />
            <div style={{ marginTop: 12 }}>
              {convertingToPdf ? 'Converting document to PDF...' : 'Preparing your file...'}
            </div>
            <div style={{ marginTop: 6, opacity: 0.8 }}>{displayName}</div>
          </div>
        ) : error || conversionError ? (
          <div className="ragas-error-message">
            <p>{conversionError || error || 'Unable to preview this file.'}</p>
            <div style={{ marginTop: 12 }}>
              <button 
                onClick={handleBack} 
                className="ragas-back-button" 
                style={{ marginRight: 8 }}
              >
                Go Back
              </button>
              <button 
                onClick={handleDownload} 
                className="ragas-download-button"
                disabled={!fileId && !fileUrl}
              >
                Download File
              </button>
            </div>
          </div>
        ) : (
          <>
            {isImage && viewerUrl && (
              <div className="ragas-preview-image-container">
                <img
                  src={viewerUrl}
                  alt={displayName || 'Image preview'}
                  className="ragas-preview-image"
                  onError={(e) => {
                    console.error('Image load error:', e);
                    setError('Unable to display this image. The file may be corrupted or in an unsupported format.');
                  }}
                />
              </div>
            )}

            {(isPdf || isOffice) && viewerUrl && (
              <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
                {conversionError ? (
                  <div className="ragas-error-message">
                    <p>{conversionError}</p>
                    <div style={{ marginTop: 12 }}>
                      <button 
                        onClick={handleDownload} 
                        className="ragas-download-button"
                        disabled={!fileId && !fileUrl}
                      >
                        Download Original File
                      </button>
                    </div>
                  </div>
                ) : (
                  <iframe
                    title={`${displayName} - Preview`}
                    src={viewerUrl}
                    className="ragas-preview-iframe"
                    onError={(e) => {
                      console.error('Document load error:', e);
                      setError(`Unable to display this ${ext ? ext.toUpperCase() : ''} file. The file may be corrupted or in an unsupported format.`);
                    }}
                  />
                )}
              </div>
            )}

            {isTextLike && viewerUrl && (
              <div style={{ width: '100%', height: '100%' }}>
                <iframe
                  title={`${displayName} - Text Preview`}
                  src={viewerUrl}
                  className="ragas-preview-iframe"
                  onError={(e) => {
                    console.error('Text load error:', e);
                    setError('Unable to display this text file. The file may be too large or in an unsupported format.');
                  }}
                />
              </div>
            )}

            {isAudio && viewerUrl && (
              <div className="ragas-audio-container">
                <audio
                  controls
                  className="ragas-preview-audio"
                  src={viewerUrl}
                  onError={() => setError('Failed to load audio file')}
                >
                  Your browser does not support the audio element.
                </audio>
                <div className="audio-filename">{displayName}</div>
              </div>
            )}

            {isVideo && viewerUrl && (
              <div className="ragas-video-container">
                <video 
                  controls 
                  className="ragas-preview-video" 
                  src={viewerUrl} 
                  onError={() => setError('Failed to load video file')}
                >
                  Your browser does not support the video tag.
                </video>
                <div className="video-filename">{displayName}</div>
              </div>
            )}

            {!isImage && !isPdf && !isOffice && !isTextLike && !isAudio && !isVideo && (
              <div className="ragas-unsupported-file">
                <p>Preview not available for this file type.</p>
                {ext && <p>File type: {ext}</p>}
                <div className="unsupported-file-name">{displayName}</div>
                {(fileId || fileUrl) && (
                  <button 
                    onClick={handleDownload} 
                    className="ragas-download-button"
                    disabled={!fileId && !fileUrl}
                  >
                    Download File
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}