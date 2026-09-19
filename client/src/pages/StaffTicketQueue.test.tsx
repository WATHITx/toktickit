import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import StaffTicketQueue from "./StaffTicketQueue";

const mockStaffUser = { id: 2, name: "Kevin Patel", email: "kevin.p@test.com", role: "IT_STAFF" };

function renderPage() {
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={{ user: mockStaffUser, loading: false, refreshUser: vi.fn(), setUser: vi.fn() }}>
        <StaffTicketQueue />
      </AuthContext.Provider>
    </MemoryRouter>
  );
}

describe("StaffTicketQueue", () => {
  beforeEach(() => { vi.stubGlobal("fetch", vi.fn()); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it("renders tickets with IT Priority and Owner badges", async () => {
  (fetch as any).mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      data: [{
        id: 1, ticketNumber: "TKT-1", summary: "Test", category: { name: "Hardware" },
        requestedPriority: "HIGH", itPriority: "HIGH", currentStatus: "NEW",
        ticketOwner: null, requester: { name: "Jennifer" }, createdAt: new Date().toISOString(),
      }],
      pagination: { totalPages: 1 },
    }),
  });

  renderPage();
  await waitFor(() => {
    expect(screen.getAllByTestId("ticket-row").length).toBeGreaterThan(0);
  });
  expect(screen.getAllByText("TKT-1").length).toBeGreaterThan(0);
  expect(screen.getAllByText("Unassigned").length).toBeGreaterThan(0);
});

  it("shows empty state when the queue has no tickets", async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true, json: async () => ({ data: [], pagination: { totalPages: 1 } }),
    });

    renderPage();
    expect(await screen.findByText(/no tickets in the queue/i)).toBeInTheDocument();
  });
});