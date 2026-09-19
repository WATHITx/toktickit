import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Login from "./pages/Login";
import ChangePassword from "./pages/ChangePassword";
import ProtectedRoute from "./components/ProtectedRoute";
import CreateTicket from "./pages/CreateTicket";
import MyTickets from "./pages/MyTickets";
import TicketDetail from "./pages/TicketDetail";
import SystemStatusWidget from "./components/SystemStatusWidget";
import StaffTicketQueue from "./pages/StaffTicketQueue";
import StaffTicketDetail from "./pages/StaffTicketDetail";
import UserManagement from "./pages/UserManagement";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/change-password" element={<ChangePassword />} />
          <Route path="/my-tickets" element={<ProtectedRoute><MyTickets /></ProtectedRoute>} />
          <Route path="/create-ticket" element={<ProtectedRoute><CreateTicket /></ProtectedRoute>} />
          <Route path="/tickets/:id" element={<ProtectedRoute><TicketDetail /></ProtectedRoute>} />
          <Route path="/system-status" element={<SystemStatusWidget />} />
          <Route path="/" element={<Navigate to="/my-tickets" replace />} />
          <Route
  path="/my-queue"
  element={
    <ProtectedRoute allowedRoles={["IT_STAFF", "ADMINISTRATOR"]}>
      <StaffTicketQueue />
    </ProtectedRoute>
  }
/>
          <Route
            path="/staff/tickets/:id"
            element={
              <ProtectedRoute allowedRoles={["IT_STAFF", "ADMINISTRATOR"]}>
                <StaffTicketDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute allowedRoles={["ADMINISTRATOR"]}>
                <UserManagement />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;