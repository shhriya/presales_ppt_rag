// api.js
export const BASE_URL = "http://localhost:8000";


// Upload any file (ppt, pdf, docx, etc.)
export async function uploadFile(file) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${BASE_URL}/upload-file`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) throw new Error((await res.json()).detail || "Upload failed");
  return res.json();
}

// Ask question (still needs sessionId)
export async function askQuestion(sessionId, question) {
  const res = await fetch(`${BASE_URL}/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, question }),
  });

  if (!res.ok) throw new Error((await res.json()).detail || "Ask failed");
  return res.json();
}

// ✅ List ALL stored files (no session filter by default)
export async function listFiles() {
  const res = await fetch(`${BASE_URL}/api/files`);
  if (!res.ok) throw new Error((await res.json()).detail || "List files failed");
  return res.json();
}

// Get slides for a file (if that file type supports slides)
export async function getSlides(fileId) {
  const res = await fetch(`${BASE_URL}/files/${fileId}/slides`);
  if (!res.ok) throw new Error((await res.json()).detail || "Get slides failed");
  return res.json();
}

export async function listChunks(sessionId) {
  let url = `${BASE_URL}/api/chunks`;
  if (sessionId) url += `?session_id=${sessionId}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error((await res.json()).detail || "Failed to fetch chunks");
  return await res.json(); // returns { chunks: [...] }
}


export async function login(email, password) {
  const res = await fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    throw new Error(`Login failed: ${res.status}`);
  }

  return res.json();
}

<<<<<<< HEAD
// Group Management APIs
export async function listGroups() {
  const res = await fetch(`${BASE_URL}/api/groups`);
  if (!res.ok) throw new Error((await res.json()).detail || "Failed to fetch groups");
  return res.json();
}

export async function getGroupFiles(groupId) {
  const res = await fetch(`${BASE_URL}/api/groups/${groupId}/files`);
  if (!res.ok) throw new Error((await res.json()).detail || "Failed to fetch group files");
  return res.json();
}

export async function createGroup(name, description = "") {
  const res = await fetch(`${BASE_URL}/api/groups`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, description }),
  });
  if (!res.ok) throw new Error((await res.json()).detail || "Failed to create group");
  return res.json();
}

export async function addFileToGroup(fileId, groupId) {
  const res = await fetch(`${BASE_URL}/api/groups/${groupId}/files`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file_id: fileId, group_id: groupId }),
  });
  if (!res.ok) throw new Error((await res.json()).detail || "Failed to add file to group");
  return res.json();
}

export async function removeFileFromGroup(fileId, groupId) {
  const res = await fetch(`${BASE_URL}/api/groups/${groupId}/files/${fileId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error((await res.json()).detail || "Failed to remove file from group");
  return res.json();
}

export async function getMyFiles() {
  const res = await fetch(`${BASE_URL}/api/files/my`);
  if (!res.ok) throw new Error((await res.json()).detail || "Failed to fetch my files");
  return res.json();
}

=======
export async function convertPptToPdf(sessionId, filename) {
  try {
    const response = await fetch(
      `${BASE_URL}/convert-ppt-to-pdf/${sessionId}/${filename}`,
      {
        method: "GET",
      }
    );

    if (!response.ok) {
      throw new Error(`Conversion failed: ${response.status}`);
    }

    // PDF Blob
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);

    // Auto-download
    const link = document.createElement("a");
    link.href = url;
    link.download = filename.replace(/\.[^/.]+$/, ".pdf"); // change extension to .pdf
    link.click();

    return { success: true };
  } catch (err) {
    console.error("❌ Error converting PPT to PDF:", err);
    return { success: false, error: err.message };
  }
}
>>>>>>> 44258f956ac57b15c46f220e3d9c32037fd2f258
