import React, { useEffect, useState } from "react";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    role: "employee",
  });
  const [showPwd, setShowPwd] = useState(false);

  async function api(path, opts = {}) {
    const base = "http://localhost:9000";
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

  useEffect(() => {
    load();
  }, []);

  async function handleCreate() {
    try {
      await api("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setForm({ username: "", email: "", password: "", role: "employee" });
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this user?")) return;
    try {
      await api(`/api/users/${id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="app">
      <div className="header">
        <h1>Admin - Users</h1>
        <p className="sub">
          Manage all application users here
        </p>
      </div>

      {error && <div className="status" style={{ color: "red" }}>{error}</div>}

      {/* Form Panel */}
      <div className="panel" style={{ marginBottom: 24 }}>
        <div
          className="uploader"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "12px",
            justifyContent: "space-between",
          }}
        >
          <input
            placeholder="Username"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            style={{
              flex: "1 1 180px",
              padding: "10px",
              borderRadius: "10px",
              border: "1px solid var(--border)",
            }}
          />
          <input
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            style={{
              flex: "1 1 220px",
              padding: "10px",
              borderRadius: "10px",
              border: "1px solid var(--border)",
            }}
          />
          <div
            style={{
              flex: "1 1 220px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <input
              placeholder="Password"
              type={showPwd ? "text" : "password"}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: "10px",
                border: "1px solid var(--border)",
              }}
            />
            <button
              type="button"
              className="btn"
              onClick={() => setShowPwd((p) => !p)}
            >
              {showPwd ? "Hide" : "Show"}
            </button>
          </div>
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            style={{
              flex: "1 1 180px",
              padding: "10px",
              borderRadius: "10px",
              border: "1px solid var(--border)",
            }}
          >
            <option value="employee">employee</option>
            <option value="developer">developer</option>
            <option value="client">client</option>
            <option value="admin">admin</option>
          </select>
          <button className="btn" onClick={handleCreate}>
            Create
          </button>
        </div>
      </div>

      {/* Scrollable User List */}
      <div
        className="user-list"
        style={{
          maxHeight: "400px", // 👈 limit height
          overflowY: "auto", // 👈 scroll enabled
          // paddingRight: "-10px",
          marginLeft: "20px",
          marginRight: "20px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)", // 2 equal columns
            gap: "10px",
            width: "100%",
            maxWidth: "900px",
            margin: "0 auto",
          }}
        >
          {users.map((u) => (
            <div
              key={u.user_id}
              className="message bot"
              style={{
                display: "flex",
                flexDirection: "column",
                background: "var(--panel)",
                border: "1px solid var(--border)",
                borderRadius: "12px",
                padding: "16px",
                minHeight: "120px",
              }}
            >
              <div>
                <div style={{ fontWeight: 600, color: "var(--text)" }}>
                  {u.username}{" "}
                  <span style={{ color: "var(--muted)" }}>• {u.role}</span>
                </div>
                <div style={{ fontSize: "13px", color: "var(--muted)" }}>
                  {u.email}
                </div>
              </div>
              <div style={{ marginTop: "12px", textAlign: "right" }}>
                <button className="btn" onClick={() => handleDelete(u.user_id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}