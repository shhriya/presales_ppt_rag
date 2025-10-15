import React, { useState } from "react";
import { login as apiLogin } from "../api/api";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      console.log("[LoginPage] Submitting login for", email);
      const data = await apiLogin(email, password);
      login(data);
      console.log("[LoginPage] Login success, navigating to /");
      navigate("/");
    } catch (err) {
      console.error("Login failed:", err);
      const message = err?.message || "Login failed. Please try again.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        background: "#0f172a", // dark background like TabsApp
      }}
    >
      <div
        style={{
          background: "#1e293b",
          padding: "40px 32px",
          borderRadius: "12px",
          boxShadow: "0 0 20px rgba(0,0,0,0.5)",
          width: "100%",
          maxWidth: "400px",
          color: "#fff",
        }}
      >
        <h2 style={{ textAlign: "center", marginBottom: "24px", fontWeight: 600 }}>
          Login
        </h2>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <input
            type="text"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="username"
            style={{
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid #334155",
              background: "#0f172a",
              color: "#fff",
              outline: "none",
            }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            style={{
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid #334155",
              background: "#0f172a",
              color: "#fff",
              outline: "none",
            }}
          />
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              padding: "12px",
              borderRadius: "8px",
              border: "none",
              background: isSubmitting ? "#475569" : "#3b82f6",
              color: "#fff",
              fontWeight: 600,
              cursor: isSubmitting ? "not-allowed" : "pointer",
              transition: "0.2s",
            }}
            onMouseEnter={(e) => !isSubmitting && (e.target.style.background = "#2563eb")}
            onMouseLeave={(e) => !isSubmitting && (e.target.style.background = "#3b82f6")}
          >
            {isSubmitting ? "Logging in..." : "Login"}
          </button>
        </form>

        {error && <div style={{ color: "#f87171", textAlign: "center", marginTop: 12 }}>{error}</div>}
      </div>
    </div>
  );
}