import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AppShell from "./shell/AppShell";
import { LoadingState, ForbiddenMessage } from "./PageStates";

export default function ProtectedRoute({ children, allowedRoles }: { children: ReactNode; allowedRoles?: string[] }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="container py-4"><LoadingState /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.mustChangePassword) return <Navigate to="/change-password" replace />;
  // Signed in but the wrong role: say so instead of pretending they were signed out (FR-20)
  if (allowedRoles && !allowedRoles.includes(user.role)) return <AppShell><ForbiddenMessage /></AppShell>;

  return <>{children}</>;
}
