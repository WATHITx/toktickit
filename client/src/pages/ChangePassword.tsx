import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiPost } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const { refreshUser } = useAuth();
  const navigate = useNavigate();

  const rules = {
    length: newPassword.length >= 8,
    case: /[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword),
    numberSpecial: /[0-9]/.test(newPassword) && /[^A-Za-z0-9]/.test(newPassword),
  };
  const allRulesPass = rules.length && rules.case && rules.numberSpecial;
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allRulesPass || !passwordsMatch) return;
    setStatus("submitting");

    try {
      await apiPost("/auth/change-password", { currentPassword, newPassword });
      await refreshUser();
      navigate("/my-tickets");
    } catch (err: any) {
      setErrorMsg(err.message || "Unable to change password");
      setStatus("error");
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "100vh", backgroundColor: "var(--color-bg)" }}>
      <form className="card p-4" style={{ maxWidth: 420, width: "100%" }} onSubmit={handleSubmit}>
        <h4>Change Your Password</h4>
        <p className="text-muted">You must change your password to continue.</p>

        <label htmlFor="current">Current (temporary) password</label>
        <input id="current" type="password" className="form-control" value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)} required />

        <label htmlFor="new" className="mt-3">New password</label>
        <input id="new" type="password" className="form-control" value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)} required />

        <label htmlFor="confirm" className="mt-3">Confirm new password</label>
        <input id="confirm" type="password" className="form-control" value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)} required />

        <div className="mt-3 p-2" style={{ backgroundColor: "var(--color-pale-green, #e8f5e9)" }}>
          <div>{rules.length ? "?" : "?"} At least 8 characters</div>
          <div>{rules.case ? "?" : "?"} Include upper and lower case letters</div>
          <div>{rules.numberSpecial ? "?" : "?"} Include a number and a special character</div>
        </div>

        {status === "error" && <div className="alert alert-danger mt-3">{errorMsg}</div>}

        <button type="submit" className="btn btn-primary w-100 mt-4"
          disabled={!allRulesPass || !passwordsMatch || status === "submitting"}>
          {status === "submitting" ? "Saving…" : "Continue"}
        </button>
      </form>
    </div>
  );
}
