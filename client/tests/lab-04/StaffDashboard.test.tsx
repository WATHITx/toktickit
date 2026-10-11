import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthContext } from "../../src/context/AuthContext";
import StaffDashboard from "../../src/pages/StaffDashboard";
import StaffTicketQueue from "../../src/pages/StaffTicketQueue";

const kevin = { id: 2, name: "Kevin Patel", email: "kevin.p@test.com", role: "IT_STAFF" };
const admin = { id: 9, name: "Admin User", email: "admin@test.com", role: "ADMINISTRATOR" };
const json = (body: unknown, status = 200) => Promise.resolve({ ok: status < 400, status, json: async () => body });

const zeroStatuses = { NEW: 0, OPEN: 0, IN_PROGRESS: 0, WAITING_FOR_REQUESTER: 0, RESOLVED: 0, CLOSED: 0, REOPENED: 0, CANCELLED: 0 };
const dashboard = {
  metrics: { unassigned: 4, assignedToMe: 6, myOpenActions: 2 },
  byStatus: { ...zeroStatuses, NEW: 3, IN_PROGRESS: 4, CLOSED: 5 },
  byItPriority: { HIGH: 2, MEDIUM: 5, LOW: 3 },
  urgent: [{ id: 30, ticketNumber: "TKT-30", summary: "Printer offline", currentStatus: "OPEN", itPriority: "HIGH", createdAt: "2026-10-01T02:00:00.000Z", ticketOwner: null }],
  recentlyUpdated: [{ id: 12, ticketNumber: "TKT-12", summary: "VPN drops", currentStatus: "IN_PROGRESS", updatedAt: new Date().toISOString() }],
  myOpenActionsList: [{ id: 41, ticketId: 12, ticketNumber: "TKT-12", description: "Reset VPN profile", actionAt: "2026-10-09T03:15:00.000Z" }],
};

function renderAt(path: string, user = kevin) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthContext.Provider value={{ user, loading: false, refreshUser: vi.fn(), setUser: vi.fn() }}>
        <Routes>
          <Route path="/dashboard" element={<StaffDashboard />} />
          <Route path="/my-queue" element={<StaffTicketQueue />} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>
  );
}

describe("StaffDashboard", () => {
  beforeEach(() => { vi.stubGlobal("fetch", vi.fn()); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it("renders metric cards, counts and lists that link to filtered views (UI-01, FR-13, FR-15)", async () => {
    (fetch as any).mockImplementation(() => json(dashboard));
    renderAt("/dashboard");

    expect(await screen.findByRole("link", { name: "Unassigned: 4. View tickets" })).toHaveAttribute("href", "/my-queue?status=ACTIVE&ownership=unassigned");
    expect(screen.getByRole("link", { name: "Assigned to Me: 6. View tickets" })).toHaveAttribute("href", "/my-queue?status=ACTIVE&ownership=mine");
    expect(screen.getByRole("link", { name: "My Open Actions: 2. View actions" })).toBeInTheDocument();
    expect((fetch as any).mock.calls[0][0]).toBe("/api/dashboard/staff");

    // Every status is listed (zeros included) and links to the queue
    const byStatus = screen.getByTestId("by-status");
    expect(within(byStatus).getAllByRole("link")).toHaveLength(8);
    expect(within(byStatus).getByRole("link", { name: "Closed: 5 tickets" })).toHaveAttribute("href", "/my-queue?status=CLOSED");
    expect(within(byStatus).getByRole("link", { name: "Reopened: 0 tickets" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "High priority: 2 active tickets" })).toHaveAttribute("href", "/my-queue?status=ACTIVE&itPriority=HIGH");

    expect(within(screen.getByTestId("urgent")).getByRole("link")).toHaveAttribute("href", "/staff/tickets/30");
    expect(within(screen.getByTestId("urgent")).getByRole("link")).toHaveTextContent("Unassigned");
    expect(within(screen.getByTestId("my-open-actions")).getByRole("link")).toHaveAttribute("href", "/staff/tickets/12");
    expect(screen.queryByTestId("user-counts")).not.toBeInTheDocument();
  });

  it("moves focus to My Open Actions when its card is used", async () => {
    (fetch as any).mockImplementation(() => json(dashboard));
    Element.prototype.scrollIntoView = vi.fn();
    const user = userEvent.setup();
    renderAt("/dashboard");

    await user.click(await screen.findByRole("link", { name: "My Open Actions: 2. View actions" }));
    expect(screen.getByRole("heading", { name: "My Open Actions" })).toHaveFocus();
  });

  it("shows zeros and empty messages, and a safe error with Retry (UI-02, AC-14, FR-18)", async () => {
    (fetch as any)
      .mockImplementationOnce(() => json({ error: "boom" }, 500))
      .mockImplementation(() => json({
        metrics: { unassigned: 0, assignedToMe: 0, myOpenActions: 0 }, byStatus: zeroStatuses,
        byItPriority: { HIGH: 0, MEDIUM: 0, LOW: 0 }, urgent: [], recentlyUpdated: [], myOpenActionsList: [],
      }));
    const user = userEvent.setup();
    renderAt("/dashboard");

    expect(await screen.findByText(/unable to reach toktickit/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByRole("link", { name: "Unassigned: 0. View tickets" })).toBeInTheDocument();
    expect(screen.getByText("No urgent tickets.")).toBeInTheDocument();
    expect(screen.getByText("You have no open actions.")).toBeInTheDocument();
    expect(screen.getByText("No recent activity.")).toBeInTheDocument();
  });

  it("adds user counts for Administrators (FR-14)", async () => {
    (fetch as any).mockImplementation(() => json({
      ...dashboard,
      userCounts: { REQUESTER: { active: 5, inactive: 1 }, IT_STAFF: { active: 3, inactive: 0 }, ADMINISTRATOR: { active: 1, inactive: 0 } },
    }));
    renderAt("/dashboard", admin);

    const users = await screen.findByTestId("user-counts");
    const requesters = within(users).getByRole("link", { name: /Requesters/ });
    expect(requesters).toHaveAttribute("href", "/admin/users?role=REQUESTER");
    expect(requesters).toHaveTextContent("5 active");
    expect(requesters).toHaveTextContent("1 inactive");
  });

  it("opens the Ticket Queue with the drill-down filters applied from the URL (FR-16)", async () => {
    (fetch as any).mockImplementation(() => json({ data: [], pagination: { totalPages: 1 } }));
    renderAt("/my-queue?status=ACTIVE&ownership=unassigned&itPriority=HIGH");

    await waitFor(() => expect((fetch as any).mock.calls.length).toBeGreaterThan(0));
    const url = (fetch as any).mock.calls[0][0] as string;
    expect(url).toContain("status=ACTIVE");
    expect(url).toContain("ownership=unassigned");
    expect(url).toContain("itPriority=HIGH");
    expect(screen.getByDisplayValue("All open (active)")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Unassigned")).toBeInTheDocument();
  });
});
