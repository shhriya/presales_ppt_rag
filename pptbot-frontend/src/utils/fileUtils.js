import axios from 'axios';
import { BASE_URL } from '../api/api';

export const getFileViewerUrl = (fileId, filename) => {
  const extension = filename?.split('.').pop().toLowerCase();
  
  // For PDFs, serve directly using the files endpoint
  if (extension === 'pdf') {
    return `${BASE_URL}/files/${fileId}`;
  }
  
  // For Office documents, use the conversion endpoint
  if (['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(extension)) {
    return `${BASE_URL}/files/${fileId}/as-pdf`;
  }
  
  // For images, serve directly
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(extension)) {
    return `${BASE_URL}/files/${fileId}`;
  }
  
  // For other file types, force download
  return `${BASE_URL}/files/${fileId}?download=true`;
};

export const downloadFile = async (fileId, filename) => {
  try {
    const response = await axios({
      url: `${BASE_URL}/files/${fileId}/download`,
      method: 'GET',
      responseType: 'blob',
    });
    
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (error) {
    console.error('Error downloading file:', error);
    throw error;
  }
};

// Function to check if a file type is viewable in the browser
export const isFileViewable = (filename) => {
  if (!filename) return false;
  const extension = filename.split('.').pop().toLowerCase();
  return [
    'pdf', 
    'jpg', 
    'jpeg', 
    'png', 
    'gif', 
    'bmp', 
    'webp',
    'doc',
    'docx',
    'ppt',
    'pptx',
    'xls',
    'xlsx'
  ].includes(extension);
};
