import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiPost } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const { refreshUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === "submitting") return;
    setStatus("submitting");

    try {
      const result = await apiPost<{ mustChangePassword: boolean }>("/auth/login", { email, password });
      await refreshUser();
      navigate(result.mustChangePassword ? "/change-password" : "/my-tickets");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center px-3" style={{ minHeight: "100vh", backgroundColor: "var(--color-bg)" }}>
      <form className="card p-4" style={{ maxWidth: 420, width: "100%" }} onSubmit={handleSubmit}>
        <h2 className="text-center mb-4" style={{ color: "var(--color-primary)" }}>TokTickIT</h2>
        <h4>Sign in to your account</h4>

        <label htmlFor="email" className="mt-3">Email address</label>
        <input id="email" type="email" className="form-control" value={email}
          onChange={(e) => setEmail(e.target.value)} required />

        <label htmlFor="password" className="mt-3">Password</label>
        <div className="input-group">
          <input id="password" type={showPassword ? "text" : "password"} className="form-control"
            value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button type="button" className="btn btn-outline-secondary" onClick={() => setShowPassword(!showPassword)}>
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>

        {status === "error" && (
          <div className="alert alert-danger mt-3">Invalid email or password. Please try again.</div>
        )}

        <button type="submit" className="btn btn-primary w-100 mt-4" disabled={status === "submitting"}>
          {status === "submitting" ? "Signing in…" : "Sign In"}
        </button>
      </form>
    </div>
  );
}
