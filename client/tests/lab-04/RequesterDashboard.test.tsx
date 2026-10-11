import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { AuthContext } from "../../src/context/AuthContext";
import RequesterDashboard from "../../src/pages/RequesterDashboard";
import MyTickets from "../../src/pages/MyTickets";

const jennifer = { id: 1, name: "Jennifer Anderson", email: "j@test.com", role: "REQUESTER" };
const json = (body: unknown, status = 200) => Promise.resolve({ ok: status < 400, status, json: async () => body });

const dashboard = {
  metrics: { openTickets: 3, waitingForMe: 1, recentlyResolved: 2 },
  recentlyUpdated: [
    { id: 12, ticketNumber: "TKT-2026-000012", summary: "Cannot connect to VPN", currentStatus: "WAITING_FOR_REQUESTER", updatedAt: new Date(Date.now() - 2 * 3600_000).toISOString() },
  ],
  generatedAt: new Date().toISOString(),
};

function LocationProbe() {
  const location = useLocation();
  return <p data-testid="location">{location.pathname}{location.search}</p>;
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthContext.Provider value={{ user: jennifer, loading: false, refreshUser: vi.fn(), setUser: vi.fn() }}>
        <Routes>
          <Route path="/dashboard" element={<RequesterDashboard />} />
          <Route path="/my-tickets" element={<><MyTickets /><LocationProbe /></>} />
          <Route path="*" element={<LocationProbe />} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>
  );
}

describe("RequesterDashboard", () => {
  beforeEach(() => { vi.stubGlobal("fetch", vi.fn()); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it("shows the three metrics and recently updated tickets, each linking to the right place (UI-03, FR-12, FR-15)", async () => {
    (fetch as any).mockImplementation(() => json(dashboard));
    renderAt("/dashboard");

    expect(await screen.findByRole("link", { name: "Open Tickets: 3. View tickets" })).toHaveAttribute("href", "/my-tickets?status=ACTIVE");
    expect(screen.getByRole("link", { name: "Waiting for Me: 1. View tickets" })).toHaveAttribute("href", "/my-tickets?status=WAITING_FOR_REQUESTER");
    expect(screen.getByRole("link", { name: "Recently Resolved: 2. View tickets" })).toHaveAttribute("href", "/my-tickets?status=RECENTLY_RESOLVED");
    expect((fetch as any).mock.calls[0][0]).toBe("/api/dashboard/requester");

    const row = screen.getByRole("link", { name: /TKT-2026-000012/ });
    expect(row).toHaveAttribute("href", "/tickets/12");
    expect(row).toHaveTextContent("Waiting for Requester");
    expect(row).toHaveTextContent("2 hours ago");
    expect(screen.getByRole("link", { name: "View all my tickets" })).toHaveAttribute("href", "/my-tickets");
  });

  it("shows zero metrics and an empty-state message when the Requester has no tickets (UI-04, AC-14)", async () => {
    (fetch as any).mockImplementation(() => json({ metrics: { openTickets: 0, waitingForMe: 0, recentlyResolved: 0 }, recentlyUpdated: [] }));
    renderAt("/dashboard");

    expect(await screen.findByRole("link", { name: "Open Tickets: 0. View tickets" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Waiting for Me: 0. View tickets" })).toBeInTheDocument();
    expect(screen.getByText(/no ticket activity yet/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create a ticket" })).toHaveAttribute("href", "/create-ticket");
  });

  it("shows a safe error with Retry when the dashboard cannot load (FR-18)", async () => {
    (fetch as any).mockImplementationOnce(() => Promise.reject(new TypeError("Failed to fetch")))
      .mockImplementation(() => json(dashboard));
    const user = userEvent.setup();
    renderAt("/dashboard");

    expect(await screen.findByText(/unable to reach toktickit/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("link", { name: "Open Tickets: 3. View tickets" })).toBeInTheDocument();
  });

  it("opens My Tickets with the drill-down filter applied from the URL (FR-16)", async () => {
    (fetch as any).mockImplementation((url: string) =>
      url.startsWith("/api/categories") ? json([]) : json({ data: [], pagination: { totalPages: 1 } }));
    renderAt("/my-tickets?status=WAITING_FOR_REQUESTER");

    expect(await screen.findByLabelText("Filter by status")).toHaveValue("WAITING_FOR_REQUESTER");
    await waitFor(() => {
      const listCall = (fetch as any).mock.calls.find(([u]: [string]) => u.startsWith("/api/tickets?"));
      expect(listCall[0]).toContain("status=WAITING_FOR_REQUESTER");
    });
    expect(screen.getByTestId("location")).toHaveTextContent("/my-tickets?status=WAITING_FOR_REQUESTER");
  });
});
