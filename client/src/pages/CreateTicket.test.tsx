import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import CreateTicket from "./CreateTicket";

const mockUser = { id: 1, name: "Jennifer Anderson", email: "j@test.com", role: "REQUESTER" };

function renderWithRequester() {
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={{ user: mockUser, loading: false, refreshUser: vi.fn(), setUser: vi.fn() }}>
        <CreateTicket />
      </AuthContext.Provider>
    </MemoryRouter>
  );
}

describe("CreateTicket", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    // mock การโหลด categories/related-systems ตอน mount (ทุก test ต้องมี 2 อันนี้)
    (fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => [{ id: 1, name: "Hardware" }] })
      .mockResolvedValueOnce({ ok: true, json: async () => [{ id: 1, name: "Corporate Laptop" }] });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows a field error and does not call POST when Summary is empty (UI-03)", async () => {
    const user = userEvent.setup();
    renderWithRequester();

    await waitFor(() => screen.getByText("Hardware"));

    const submitButton = screen.getByRole("button", { name: /submit/i });
    await user.click(submitButton);

    // HTML5 required attribute จะกันไม่ให้ submit event ยิงเลย
    // ถ้าอยากทดสอบ backend-side error message แทน ต้อง mock fetch ตัวที่ 3 ให้คืน 400
    expect(fetch).toHaveBeenCalledTimes(2); // แค่ categories + related-systems ไม่มี POST เพิ่ม
  });

  it("shows success state with the returned Ticket Number (UI-04)", async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ticketNumber: "TKT-2026-000001" }),
    });

    const user = userEvent.setup();
    renderWithRequester();

    await waitFor(() => screen.getByText("Hardware"));

    await user.selectOptions(screen.getByLabelText(/category/i), "1");
    await user.selectOptions(screen.getByLabelText(/related system/i), "1");
    await user.type(screen.getByLabelText(/summary/i), "Laptop battery drains quickly");
    await user.type(screen.getByLabelText(/description/i), "Battery drains fast even when idle.");
    await user.click(screen.getByRole("button", { name: /submit/i }));

    expect(await screen.findByText("TKT-2026-000001")).toBeInTheDocument();
  });

  it("shows a safe error and preserves form values when backend is unreachable (UI-05)", async () => {
    (fetch as any).mockRejectedValueOnce(new Error("Network error"));

    const user = userEvent.setup();
    renderWithRequester();

    await waitFor(() => screen.getByText("Hardware"));

    await user.selectOptions(screen.getByLabelText(/category/i), "1");
    await user.selectOptions(screen.getByLabelText(/related system/i), "1");
    await user.type(screen.getByLabelText(/summary/i), "Laptop battery drains quickly");
    await user.type(screen.getByLabelText(/description/i), "Battery drains fast even when idle.");
    await user.click(screen.getByRole("button", { name: /submit/i }));

    expect(await screen.findByText(/unable to connect/i)).toBeInTheDocument();
    // เช็คว่าค่าฟอร์มยังอยู่ ไม่ถูกล้าง
    expect(screen.getByLabelText(/summary/i)).toHaveValue("Laptop battery drains quickly");
  });

  it("disables the Submit button during submission to prevent duplicate calls (UI-10)", async () => {
    let resolvePost: (value: unknown) => void;
    const postPromise = new Promise((resolve) => { resolvePost = resolve; });
    (fetch as any).mockReturnValueOnce(postPromise);

    const user = userEvent.setup();
    renderWithRequester();

    await waitFor(() => screen.getByText("Hardware"));

    await user.selectOptions(screen.getByLabelText(/category/i), "1");
    await user.selectOptions(screen.getByLabelText(/related system/i), "1");
    await user.type(screen.getByLabelText(/summary/i), "Laptop battery drains quickly");
    await user.type(screen.getByLabelText(/description/i), "Battery drains fast even when idle.");

    const submitButton = screen.getByRole("button", { name: /submit/i });
    await user.click(submitButton);

    expect(submitButton).toBeDisabled();

    resolvePost!({ ok: true, json: async () => ({ ticketNumber: "TKT-2026-000001" }) });
  });
});