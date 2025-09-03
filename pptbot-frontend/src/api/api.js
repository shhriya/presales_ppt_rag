// api.js
export const BASE_URL = "http://localhost:8000";

function authHeaders() {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return {};
    const u = JSON.parse(raw);
    const headers = {};
    if (u?.user_id) headers["X-User-Id"] = String(u.user_id);
    if (u?.role) headers["X-User-Role"] = String(u.role);
    return headers;
  } catch {
    return {};
  }
}


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
  const res = await fetch(`${BASE_URL}/api/files`, { headers: { ...authHeaders() } });
  if (!res.ok) throw new Error((await res.json()).detail || "List files failed");
  return res.json();
}

// Get slides for a file (if that file type supports slides)
export async function getSlides(fileId) {
  const res = await fetch(`${BASE_URL}/files/${fileId}/slides`, { headers: { ...authHeaders() } });
  if (!res.ok) throw new Error((await res.json()).detail || "Get slides failed");
  return res.json();
}

export async function listChunks(sessionId) {
  let url = `${BASE_URL}/api/chunks`;
  if (sessionId) url += `?session_id=${sessionId}`;

  const res = await fetch(url, { headers: { ...authHeaders() } });
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

// Group Management APIs
export async function listGroups() {
  const res = await fetch(`${BASE_URL}/api/groups`, { headers: { ...authHeaders() } });
  if (!res.ok) throw new Error((await res.json()).detail || "Failed to fetch groups");
  return res.json();
}

export async function getGroupFiles(groupId) {
  const res = await fetch(`${BASE_URL}/api/groups/${groupId}/files`, { headers: { ...authHeaders() } });
  if (!res.ok) throw new Error((await res.json()).detail || "Failed to fetch group files");
  return res.json();
}

export async function createGroup(name, description = "") {
  const res = await fetch(`${BASE_URL}/api/groups`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ name, description }),
  });
  if (!res.ok) throw new Error((await res.json()).detail || "Failed to create group");
  return res.json();
}

export async function deleteGroup(groupId) {
  const res = await fetch(`${BASE_URL}/api/groups/${groupId}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error((await res.json()).detail || "Failed to delete group");
  return res.json();
}

export async function leaveGroup(groupId) {
  const res = await fetch(`${BASE_URL}/api/groups/${groupId}/leave`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error((await res.json()).detail || "Failed to leave group");
  return res.json();
}

export async function addFileToGroup(fileId, groupId) {
  const res = await fetch(`${BASE_URL}/api/groups/${groupId}/files`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ file_id: fileId, group_id: groupId }),
  });
  if (!res.ok) throw new Error((await res.json()).detail || "Failed to add file to group");
  return res.json();
}

export async function removeFileFromGroup(fileId, groupId) {
  const res = await fetch(`${BASE_URL}/api/groups/${groupId}/files/${fileId}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error((await res.json()).detail || "Failed to remove file from group");
  return res.json();
}

export async function getMyFiles() {
  const res = await fetch(`${BASE_URL}/api/files/my`, { headers: { ...authHeaders() } });
  if (!res.ok) throw new Error((await res.json()).detail || "Failed to fetch my files");
  return res.json();
}

// User Management APIs
export async function getGroupUsers(groupId) {
  const res = await fetch(`${BASE_URL}/api/groups/${groupId}/users`, { headers: { ...authHeaders() } });
  if (!res.ok) throw new Error((await res.json()).detail || "Failed to fetch group users");
  return res.json();
}

export async function addUserToGroupByEmail(groupId, email) {
  const formData = new FormData();
  formData.append('user_email', email);
  
  const res = await fetch(`${BASE_URL}/api/groups/${groupId}/users/by-email`, {
    method: "POST",
    headers: { ...authHeaders() },
    body: formData,
  });
  if (!res.ok) throw new Error((await res.json()).detail || "Failed to add user to group");
  return res.json();
}

export async function removeUserFromGroup(groupId, userId) {
  const res = await fetch(`${BASE_URL}/api/groups/${groupId}/users/${userId}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error((await res.json()).detail || "Failed to remove user from group");
  return res.json();
}
