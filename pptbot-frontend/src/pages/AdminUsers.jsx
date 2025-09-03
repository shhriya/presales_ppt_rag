import React, { useEffect, useState } from "react";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ username: "", email: "", password: "", role: "employee" });
  const [showPwd, setShowPwd] = useState(false);

  async function api(path, opts={}) {
    const base = "http://localhost:8000";
    const headers = opts.headers || {};
    const raw = localStorage.getItem("user");
    if (raw) {
      try {
        const u = JSON.parse(raw);
        if (u?.user_id) headers["X-User-Id"] = String(u.user_id);
        if (u?.role) headers["X-User-Role"] = String(u.role);
      } catch {}
    }
    const res = await fetch(base + path, { ...opts, headers });
    if (!res.ok) throw new Error((await res.json()).detail || "Request failed");
    return res.json();
  }

  async function load() {
    try {
      setError("");
      const data = await api("/api/users");
      setUsers(data);
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate() {
    try {
      await api("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      setForm({ username: "", email: "", password: "", role: "employee" });
      await load();
    } catch (e) { setError(e.message); }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this user?")) return;
    try { await api(`/api/users/${id}`, { method: "DELETE" }); await load(); } catch (e) { setError(e.message); }
  }

  return (
    <div>
      <h2>Admin - Users</h2>
      {error && <div style={{ color: "#fca5a5" }}>{error}</div>}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input placeholder="Username" value={form.username} onChange={(e)=>setForm({ ...form, username: e.target.value })} />
        <input placeholder="Email" value={form.email} onChange={(e)=>setForm({ ...form, email: e.target.value })} />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input placeholder="Password" type={showPwd ? "text" : "password"} value={form.password} onChange={(e)=>setForm({ ...form, password: e.target.value })} />
          <button type="button" className="btn" onClick={() => setShowPwd(p => !p)} style={{ background: "#374151", color: "white" }}>{showPwd ? "Hide" : "Show"}</button>
        </div>
        <select value={form.role} onChange={(e)=>setForm({ ...form, role: e.target.value })}>
          <option value="employee">employee</option>
          <option value="developer">developer</option>
          <option value="client">client</option>
          <option value="admin">admin</option>
        </select>
        <button className="btn" onClick={handleCreate} style={{ background: "#10b981", color: "white" }}>Create</button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {users.map(u => (
          <div key={u.user_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid #374151", padding: 12, borderRadius: 8 }}>
            <div>
              <div style={{ fontWeight: 600 }}>{u.username} <span style={{ color: "#94a3b8" }}>• {u.role}</span></div>
              <div style={{ color: "#94a3b8" }}>{u.email}</div>
            </div>
            <button className="btn" onClick={() => handleDelete(u.user_id)} style={{ background: "#ef4444", color: "white" }}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}


