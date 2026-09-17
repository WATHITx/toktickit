import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import ChangePassword from "./ChangePassword";

const mockUser = { id: 1, name: "Jennifer Anderson", email: "j@test.com", role: "REQUESTER", mustChangePassword: true };

function renderChangePassword() {
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={{ user: mockUser, loading: false, refreshUser: vi.fn(), setUser: vi.fn() }}>
        <ChangePassword />
      </AuthContext.Provider>
    </MemoryRouter>
  );
}

describe("ChangePassword Screen", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders password inputs and validation rules", () => {
    renderChangePassword();
    expect(screen.getByLabelText(/current \(temporary\) password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^new password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument();
    expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/include upper and lower case letters/i)).toBeInTheDocument();
    expect(screen.getByText(/include a number and a special character/i)).toBeInTheDocument();
  });

  it("keeps submit disabled until password meets rules and matches confirmation", async () => {
    const user = userEvent.setup();
    renderChangePassword();

    const submitBtn = screen.getByRole("button", { name: /continue/i });
    expect(submitBtn).toBeDisabled();

    await user.type(screen.getByLabelText(/current \(temporary\) password/i), "DevPass!123");
    await user.type(screen.getByLabelText(/^new password/i), "NewSecret!123");
    expect(submitBtn).toBeDisabled();

    await user.type(screen.getByLabelText(/confirm new password/i), "NewSecret!123");
    expect(submitBtn).not.toBeDisabled();
  });
});
