// // api.js
// const BASE_URL = "http://localhost:8000";
 
// export async function uploadPPT(file) {
//   const formData = new FormData();
//   formData.append("file", file);
//   const res = await fetch(`${BASE_URL}/upload-ppt`, {
//     method: "POST",
//     body: formData,
//   });
//   if (!res.ok) throw new Error((await res.json()).detail || "Upload failed");
//   return res.json();
// }
 
// export async function askQuestion(sessionId, question) {
//   const res = await fetch(`${BASE_URL}/ask`, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ session_id: sessionId, question }),
//   });
//   if (!res.ok) throw new Error((await res.json()).detail || "Ask failed");
//   return res.json();
// }
 

// existing BASE_URL ...
const BASE_URL = "http://localhost:8000";

export async function uploadPPT(file) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${BASE_URL}/upload-ppt`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error((await res.json()).detail || "Upload failed");
  return res.json();
}

export async function askQuestion(sessionId, question) {
  const res = await fetch(`${BASE_URL}/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, question }),
  });
  if (!res.ok) throw new Error((await res.json()).detail || "Ask failed");
  return res.json();
}

// New: list stored PPTs (optionally filter by session_id)
export async function listPPTs(sessionId = null) {
  let url = `${BASE_URL}/api/files`;
  if (sessionId) url += `?session_id=${encodeURIComponent(sessionId)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error((await res.json()).detail || "List PPTs failed");
  return res.json();
}

// New: get slides for a PPT (file_id)
export async function getSlides(fileId) {
  const res = await fetch(`${BASE_URL}/api/files/${fileId}/slides`);
  if (!res.ok) throw new Error((await res.json()).detail || "Get slides failed");
  return res.json();
}

// New: get chunks (Phase-2)
export async function getChunks(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE_URL}/api/chunks?${qs}`);
  if (!res.ok) throw new Error((await res.json()).detail || "Get chunks failed");
  return res.json();
}
