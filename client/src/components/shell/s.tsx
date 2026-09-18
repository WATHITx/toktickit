import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { apiPost } from "../../api/client";

export default function AppShell({ children }: { children: ReactNode }) {
  const { user, setUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    try {
      await apiPost("/auth/logout", {});
    } catch {
      // ignore
    }
    setUser(null);
    navigate("/login");
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--color-bg)" }}>
      <header
        style={{ backgroundColor: "var(--color-primary)" }}
        className="d-flex justify-content-between align-items-center px-4 py-3 flex-wrap"
      >
        <span className="text-white fs-4 fw-bold">TokTickIT</span>

        {user && (user.role === "IT_STAFF" || user.role === "ADMINISTRATOR") && (
  <Link to="/my-queue" className={`text-white text-decoration-none ${isActive("/my-queue") ? "fw-bold border-bottom border-white" : ""}`}>
    My Queue
  </Link>
)}
{user && user.role === "REQUESTER" && (
  <>
    <Link to="/my-tickets" className={`text-white text-decoration-none ${isActive("/my-tickets") ? "fw-bold border-bottom border-white" : ""}`}>My Tickets</Link>
    <Link to="/create-ticket" className={`text-white text-decoration-none ${isActive("/create-ticket") ? "fw-bold border-bottom border-white" : ""}`}>+ Create Ticket</Link>
  </>
)}

        {user && (
          <nav className="d-flex gap-3">
            <Link
              to="/my-tickets"
              className={`text-white text-decoration-none ${isActive("/my-tickets") ? "fw-bold border-bottom border-white" : ""}`}
            >
              My Tickets
            </Link>
            <Link
              to="/create-ticket"
              className={`text-white text-decoration-none ${isActive("/create-ticket") ? "fw-bold border-bottom border-white" : ""}`}
            >
              + Create Ticket
            </Link>
          </nav>
        )}

        {user && (
          <div className="d-flex align-items-center gap-2">
            <span className="text-white">{user.name}</span>
            <button
              className="btn btn-sm btn-outline-light"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        )}
      </header>

      <main className="container py-4">{children}</main>
    </div>
  );
}
