import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import Login from "./Login";

const mockRefreshUser = vi.fn();
const mockSetUser = vi.fn();

function renderLogin() {
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={{ user: null, loading: false, refreshUser: mockRefreshUser, setUser: mockSetUser }}>
        <Login />
      </AuthContext.Provider>
    </MemoryRouter>
  );
}

describe("Login Screen", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    mockRefreshUser.mockReset();
    mockSetUser.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders email and password inputs and sign-in button", () => {
    renderLogin();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("toggles password visibility", async () => {
    const user = userEvent.setup();
    renderLogin();

    const passwordInput = screen.getByLabelText(/^password/i);
    const toggleButton = screen.getByRole("button", { name: /show/i });

    expect(passwordInput).toHaveAttribute("type", "password");
    await user.click(toggleButton);
    expect(passwordInput).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: /hide/i })).toBeInTheDocument();
  });

  it("displays error message on invalid credentials", async () => {
    const user = userEvent.setup();
    (fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: "Invalid email or password" }),
    });

    renderLogin();
    await user.type(screen.getByLabelText(/email address/i), "wrong@test.com");
    await user.type(screen.getByLabelText(/^password/i), "wrongpass");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText(/invalid email or password/i)).toBeInTheDocument();
  });
});
