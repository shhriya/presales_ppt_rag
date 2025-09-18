import React, { useState } from "react";

export default function UserMenu() {
  const raw = localStorage.getItem("user");
  const user = raw ? JSON.parse(raw) : null;
  const [open, setOpen] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [newPwd, setNewPwd] = useState("");
  const [msg, setMsg] = useState("");

  async function changePassword() {
    try {
      setMsg("");
      
      // Validate password
      if (!newPwd || newPwd.trim() === "") {
        setMsg("Password cannot be empty");
        return;
      }
      
      if (newPwd.length < 6) {
        setMsg("Password must be at least 6 characters long");
        return;
      }
      
      const headers = { "Content-Type": "application/json" };
      if (user?.user_id) headers["X-User-Id"] = String(user.user_id);
      if (user?.role) headers["X-User-Role"] = String(user.role);
      const res = await fetch(`http://localhost:9000/api/users/${user.user_id}/password`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ password: newPwd })
      });
      if (!res.ok) throw new Error((await res.json()).detail || "Failed to update password");
      setMsg("Password updated");
      setNewPwd("");
    } catch (e) { setMsg(e.message); }
  }

  return (
    <div style={{ position: "relative" }}>
      <button className="btn" onClick={() => setOpen(o => !o)} title="Profile" style={{ background: "#374151", color: "white" }}>
        👤
      </button>
      {open && (
        <div style={{ position: "absolute", right: 0, top: "110%", background: "#1f2937", border: "1px solid #374151", borderRadius: 8, padding: 12, minWidth: 260, zIndex: 1000 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 , color: "white"}}>{user?.username || "User"}</div>
          <div style={{ color: "#94a3b8", fontSize: 13, marginBottom: 8 }}>{user?.email}</div>
          <div style={{ color: "#94a3b8", fontSize: 13, marginBottom: 12 }}>Role: {user?.role}</div>

          <div style={{ marginBottom: 8, fontWeight: 600 , color: "white"}}>Change Password</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type={showPwd ? "text" : "password"} value={newPwd} onChange={(e)=>setNewPwd(e.target.value)} placeholder="New password" />
            <button className="btn" onClick={() => setShowPwd(p=>!p)} style={{ background: "#374151", color: "white" }}>{showPwd ? "Hide" : "Show"}</button>
            <button className="btn" onClick={changePassword} style={{ background: "#10b981", color: "white" }}>Save</button>
          </div>
          {msg && <div style={{ marginTop: 6, color: msg.includes("updated") ? "#34d399" : "#fca5a5" }}>{msg}</div>}
        </div>
      )}
    </div>
  );
}


