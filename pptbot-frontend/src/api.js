// api.js
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
 