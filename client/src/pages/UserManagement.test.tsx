import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import UserManagement from "./UserManagement";

const mockAdmin = { id: 1, name: "Admin User", email: "admin@test.com", role: "ADMINISTRATOR" };
const otherUser = { id: 2, name: "Kevin Patel", email: "kevin@test.com", role: "IT_STAFF", isActive: true };
const adminRow = { ...mockAdmin, isActive: true };

function renderPage() {
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={{ user: mockAdmin, loading: false, refreshUser: vi.fn(), setUser: vi.fn() }}>
        <UserManagement />
      </AuthContext.Provider>
    </MemoryRouter>
  );
}

describe("UserManagement", () => {
  beforeEach(() => { vi.stubGlobal("fetch", vi.fn()); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it("shows duplicate-email error when creating a user (AC-12, UI-05)", async () => {
    (fetch as any).mockImplementation((_url: string, opts?: any) => {
      if (opts?.method === "POST") {
        return Promise.resolve({
          ok: false, status: 400,
          json: async () => ({ error: "A user with this email already exists" }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => [] });
    });

    renderPage();
    const user = userEvent.setup();

    await waitFor(() => screen.getByText("+ Create User"));
    await user.click(screen.getByText("+ Create User"));
    await user.type(screen.getByLabelText(/full name/i), "Test User");
    await user.type(screen.getByLabelText(/email address/i), "existing@test.com");
    await user.click(screen.getByText("Save User"));

    expect(await screen.findByText(/already exists/i)).toBeInTheDocument();
  });

  it("lists users with name, email, role and status (FR-14)", async () => {
    (fetch as any).mockResolvedValue({ ok: true, json: async () => [adminRow, otherUser] });
    renderPage();

    expect(await screen.findAllByTestId("user-row")).toHaveLength(2);
    expect(screen.getByText("kevin@test.com")).toBeInTheDocument();
    expect(screen.getByText("IT_STAFF")).toBeInTheDocument();
  });

  it("disables the Active toggle and Deactivate button when editing your own account (AC-10, BR-17)", async () => {
    (fetch as any).mockResolvedValue({ ok: true, json: async () => [adminRow, otherUser] });
    renderPage();
    const user = userEvent.setup();

    const rows = await screen.findAllByTestId("user-row");
    await user.click(rows[0].querySelector("button")!);

    expect(screen.getByLabelText("Active")).toBeDisabled();
    expect(screen.getByText("Deactivate User")).toBeDisabled();
  });

  it("allows deactivating another user", async () => {
    (fetch as any).mockResolvedValue({ ok: true, json: async () => [adminRow, otherUser] });
    renderPage();
    const user = userEvent.setup();

    const rows = await screen.findAllByTestId("user-row");
    await user.click(rows[1].querySelector("button")!);

    expect(screen.getByLabelText("Active")).toBeEnabled();
    expect(screen.getByText("Deactivate User")).toBeEnabled();
  });

  it("shows a confirmation after resetting a password (FR-17)", async () => {
    (fetch as any).mockImplementation((_url: string, opts?: any) =>
      Promise.resolve({ ok: true, json: async () => (opts?.method === "PATCH" ? { success: true } : [adminRow, otherUser]) }));
    renderPage();
    const user = userEvent.setup();

    const rows = await screen.findAllByTestId("user-row");
    await user.click(rows[1].querySelector("button")!);
    await user.click(screen.getByText("Set New Initial Password"));
    await user.type(screen.getByLabelText(/new initial password/i), "NewTemp!88");
    await user.click(screen.getByText("Confirm"));

    expect(await screen.findByText(/must change it at next login/i)).toBeInTheDocument();
  });
});
