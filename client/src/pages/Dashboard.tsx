import { useAuth } from "../context/AuthContext";
import AppShell from "../components/shell/AppShell";
import RequesterDashboard from "./RequesterDashboard";
import StaffDashboard from "./StaffDashboard";

// /dashboard — landing page for every role (docs/lab-04/ui-spec.md Section 2).
export default function Dashboard() {
  const { user } = useAuth();
  return (
    <AppShell>
      {user?.role === "REQUESTER" ? <RequesterDashboard /> : <StaffDashboard />}
    </AppShell>
  );
}
