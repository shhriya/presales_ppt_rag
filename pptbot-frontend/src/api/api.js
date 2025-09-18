// api.js
export const BASE_URL = "http://localhost:9000";


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

// Generic fetch with timeout
async function fetchWithTimeout(resource, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  // const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(resource, { ...options, signal: controller.signal });
    return response;
  } catch (err) {
    if (err?.name === "AbortError") {
      throw new Error(`Network timeout after ${timeoutMs}ms contacting ${resource}`);
    }
    throw err;
  } finally {
    // clearTimeout(id);
  }
}

// Upload any file (ppt, pdf, docx, etc.)
export async function uploadFile(file, user, sessionId) {
  const formData = new FormData();
  formData.append("file", file);

  const headers = {
    "X-User-Id": user?.user_id || "",
    "X-User-Role": user?.role || "",
    "X-User-Name": user?.username || "",
    "X-User-Email": user?.email || "",
  };
  if (sessionId) headers["X-Session-Id"] = sessionId;

  const res = await fetch("/upload-file", {
    method: "POST",
    body: formData,
    headers,
  });
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
  const res = await fetch(`/api/files`, { headers: { ...authHeaders() } });
  if (!res.ok) throw new Error((await res.json()).detail || "List files failed");
  return res.json();
}

export async function listMySessions(userId) {
  const headers = { ...authHeaders() };
  const role = headers["X-User-Role"];
  const params = new URLSearchParams();
  if (userId) params.set("x_user_id", String(userId));
  if (role) params.set("x_user_role", String(role));
  const url = params.toString() ? `/api/my-sessions?${params.toString()}` : `/api/my-sessions`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error((await res.json()).detail || "Failed to fetch sessions");
  return res.json();
}

export async function getSessionChatHistory(sessionId) {
  const headers = { ...authHeaders() };
  const userId = headers["X-User-Id"];
  const url = userId ? `/api/sessions/${sessionId}/chat-history?x_user_id=${encodeURIComponent(userId)}` : `/api/sessions/${sessionId}/chat-history`;
  
  const res = await fetch(url, { 
    headers 
  });
  if (!res.ok) throw new Error((await res.json()).detail || "Failed to fetch chat history");
  return res.json();
}

export async function deleteSession(sessionId, userId) {
  const url = userId ? `/api/sessions/${sessionId}?x_user_id=${encodeURIComponent(userId)}` : `/api/sessions/${sessionId}`;
  const res = await fetch(url, { 
    method: "DELETE",
    headers: { ...authHeaders() } 
  });
  if (!res.ok) throw new Error((await res.json()).detail || "Failed to delete session");
  return res.json();
}

// Get slides for a file (if that file type supports slides)
export async function getSlides(fileId) {
  const res = await fetch(`/files/${fileId}/slides`, { headers: { ...authHeaders() } });
  if (!res.ok) throw new Error((await res.json()).detail || "Get slides failed");
  return res.json();
}

export async function listChunks(sessionId) {
  let url = `/api/chunks`;
  if (sessionId) url += `?session_id=${sessionId}`;

  const res = await fetch(url, { headers: { ...authHeaders() } });
  if (!res.ok) throw new Error((await res.json()).detail || "Failed to fetch chunks");
  return await res.json(); // returns { chunks: [...] }
}


export async function login(email, password) {
  const payload = { email, password };
  const options = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  };

  const tryEndpoint = async (path) => {
    const res = await fetchWithTimeout(`${BASE_URL}${path}`, options, 15000);
    if (res.ok) return res.json();
    let details = "";
    try { details = await res.text(); } catch {}
    throw new Error(`Login failed: ${res.status}${details ? ` - ${details}` : ""}`);
  };

  try {
    return await tryEndpoint(`/login`);
  } catch (err) {
    try {
      return await tryEndpoint(`/api/login`);
    } catch (aliasErr) {
      const msg = aliasErr?.message || err?.message || "Unknown error";
      if (msg.includes("TypeError") || msg.includes("Failed to fetch") || msg.includes("Network")) {
        throw new Error(`Network error contacting backend at ${BASE_URL}. ${msg}`);
      }
      throw new Error(msg);
    }
  }
}


// Group Management APIs
export async function listGroups() {
  const res = await fetch(`/api/groups`, { headers: { ...authHeaders() } });
  if (!res.ok) throw new Error((await res.json()).detail || "Failed to fetch groups");
  return res.json();
}

export async function getGroupFiles(groupId) {
  const res = await fetch(`/api/groups/${groupId}/files`, { headers: { ...authHeaders() } });
  if (!res.ok) throw new Error((await res.json()).detail || "Failed to fetch group files");
  return res.json();
}

export async function createGroup(name, description = "") {
  const res = await fetch(`/api/groups`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ name, description }),
  });
  if (!res.ok) throw new Error((await res.json()).detail || "Failed to create group");
  return res.json();
}

export async function deleteGroup(groupId) {
  const res = await fetch(`/api/groups/${groupId}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error((await res.json()).detail || "Failed to delete group");
  return res.json();
}

export async function leaveGroup(groupId) {
  const res = await fetch(`/api/groups/${groupId}/leave`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error((await res.json()).detail || "Failed to leave group");
  return res.json();
}

export async function addFileToGroup(fileId, groupId) {
  const res = await fetch(`/api/groups/${groupId}/files`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ file_id: fileId, group_id: groupId }),
  });
  if (!res.ok) throw new Error((await res.json()).detail || "Failed to add file to group");
  return res.json();
}

export async function removeFileFromGroup(fileId, groupId) {
  const res = await fetch(`/api/groups/${groupId}/files/${fileId}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error((await res.json()).detail || "Failed to remove file from group");
  return res.json();
}

export async function getMyFiles() {
  const res = await fetch(`/api/files/my`, { headers: { ...authHeaders() } });
  if (!res.ok) throw new Error((await res.json()).detail || "Failed to fetch my files");
  return res.json();
}

// User Management APIs
export async function getGroupUsers(groupId) {
  const res = await fetch(`/api/groups/${groupId}/users`, { headers: { ...authHeaders() } });
  if (!res.ok) throw new Error((await res.json()).detail || "Failed to fetch group users");
  return res.json();
}

export async function addUserToGroupByEmail(groupId, email) {
  const formData = new FormData();
  formData.append('user_email', email);
  
  const res = await fetch(`/api/groups/${groupId}/users/by-email`, {
    method: "POST",
    headers: { ...authHeaders() },
    body: formData,
  });
  if (!res.ok) throw new Error((await res.json()).detail || "Failed to add user to group");
  return res.json();
}

export async function removeUserFromGroup(groupId, userId) {
  const res = await fetch(`/api/groups/${groupId}/users/${userId}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error((await res.json()).detail || "Failed to remove user from group");
  return res.json();
}
