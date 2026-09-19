import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import StaffTicketDetail from "./StaffTicketDetail";

const mockStaffUser = { id: 2, name: "Kevin Patel", email: "kevin.p@test.com", role: "IT_STAFF" };

const baseTicket = {
  id: 1, ticketNumber: "TKT-1", summary: "s", description: "d",
  category: { name: "Hardware" }, relatedSystem: { name: "Laptop" },
  requester: { id: 1, name: "Jennifer" }, requestedPriority: "LOW", itPriority: "LOW",
  currentStatus: "NEW", ticketOwner: null, problemAppearsResolved: false,
};

function mockApi(ticket = baseTicket) {
  (fetch as any).mockImplementation((url: string) => {
    const body = url.includes("/notes") || url.includes("/comments") ? []
      : url.includes("/staff/users") ? [{ id: 2, name: "Kevin Patel" }]
      : ticket;
    return Promise.resolve({ ok: true, json: async () => body });
  });
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/staff/tickets/1"]}>
      <AuthContext.Provider value={{ user: mockStaffUser, loading: false, refreshUser: vi.fn(), setUser: vi.fn() }}>
        <Routes>
          <Route path="/staff/tickets/:id" element={<StaffTicketDetail />} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>
  );
}

describe("StaffTicketDetail", () => {
  beforeEach(() => { vi.stubGlobal("fetch", vi.fn()); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it("shows Internal Notes section with 'Staff only' label distinct from Public Comments (UI-04)", async () => {
    mockApi();
    renderPage();
    expect(await screen.findByText(/staff only/i)).toBeInTheDocument();
    expect(screen.getByText("Public Comments")).toBeInTheDocument();
  });

  it("only offers valid next statuses in the Status dropdown (BR-13)", async () => {
    mockApi();
    renderPage();
    const select = await screen.findByTestId("status-select");
    const options = Array.from(select.querySelectorAll("option")).map((o) => o.value);
    expect(options).toEqual(["NEW", "OPEN", "IN_PROGRESS", "CANCELLED"]);
    expect(options).not.toContain("CLOSED");
  });

  it("shows the resolved hint when the Requester marked the problem resolved", async () => {
    mockApi({ ...baseTicket, problemAppearsResolved: true });
    renderPage();
    expect(await screen.findByText(/appears resolved/i)).toBeInTheDocument();
  });
});
