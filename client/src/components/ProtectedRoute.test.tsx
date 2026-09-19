import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthContext, User } from "../context/AuthContext";
import ProtectedRoute from "./ProtectedRoute";

function renderAt(user: User | null, allowedRoles?: string[]) {
  return render(
    <MemoryRouter initialEntries={["/secret"]}>
      <AuthContext.Provider value={{ user, loading: false, refreshUser: vi.fn(), setUser: vi.fn() }}>
        <Routes>
          <Route path="/login" element={<p>login screen</p>} />
          <Route path="/change-password" element={<p>change password screen</p>} />
          <Route path="/secret" element={<ProtectedRoute allowedRoles={allowedRoles}><p>secret content</p></ProtectedRoute>} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>
  );
}

const requester: User = { id: 1, name: "Jennifer", email: "j@test.com", role: "REQUESTER", mustChangePassword: false };

describe("ProtectedRoute", () => {
  it("keeps a user who must change their password on the Change Password screen (UI-02, AC-02)", () => {
    renderAt({ ...requester, mustChangePassword: true });
    expect(screen.getByText("change password screen")).toBeInTheDocument();
    expect(screen.queryByText("secret content")).not.toBeInTheDocument();
  });

  it("redirects an unauthenticated visitor to Login", () => {
    renderAt(null);
    expect(screen.getByText("login screen")).toBeInTheDocument();
  });

  it("redirects a user whose role is not allowed", () => {
    renderAt(requester, ["ADMINISTRATOR"]);
    expect(screen.getByText("login screen")).toBeInTheDocument();
    expect(screen.queryByText("secret content")).not.toBeInTheDocument();
  });

  it("renders the page for an allowed role", () => {
    renderAt(requester, ["REQUESTER"]);
    expect(screen.getByText("secret content")).toBeInTheDocument();
  });
});
