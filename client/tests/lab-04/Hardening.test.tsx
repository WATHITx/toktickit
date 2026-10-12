import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthContext } from "../../src/context/AuthContext";
import TicketDetail from "../../src/pages/TicketDetail";
import StaffTicketDetail from "../../src/pages/StaffTicketDetail";

// Final hardening (FR-18, FR-19): no duplicate posts, no lost text after a failure, shared not-found state.

const jennifer = { id: 1, name: "Jennifer Anderson", email: "j@test.com", role: "REQUESTER" };
const kevin = { id: 2, name: "Kevin Patel", email: "kevin.p@test.com", role: "IT_STAFF" };
const json = (body: unknown, status = 200) => Promise.resolve({ ok: status < 400, status, json: async () => body });

const requesterTicket = {
  id: 1, ticketNumber: "TKT-1", summary: "s", description: "d", category: { name: "Network" }, relatedSystem: { name: "VPN" },
  requestedPriority: "LOW", currentStatus: "OPEN", problemAppearsResolved: false, createdAt: new Date().toISOString(),
  requesterId: 1, attachments: [], version: 1,
};
const staffTicket = {
  ...requesterTicket, requester: { id: 1, name: "Jennifer Anderson" }, itPriority: "LOW", ticketOwner: null,
  resolutionGate: { ok: false, reasons: [] },
};

const writes = () => (fetch as any).mock.calls.filter(([, init]: [string, RequestInit]) => init?.method === "POST");

function renderAt(path: string, user: typeof jennifer, element: JSX.Element, route: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthContext.Provider value={{ user, loading: false, refreshUser: vi.fn(), setUser: vi.fn() }}>
        <Routes><Route path={route} element={element} /></Routes>
      </AuthContext.Provider>
    </MemoryRouter>
  );
}

describe("Final hardening", () => {
  beforeEach(() => { vi.stubGlobal("fetch", vi.fn()); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it("keeps a Requester's comment text when posting fails, and shows why (FR-19)", async () => {
    (fetch as any).mockImplementation((url: string, init: RequestInit = {}) => {
      if (init.method === "POST") return Promise.reject(new TypeError("Failed to fetch"));
      if (/\/(comments|actions|history)$/.test(url)) return json([]);
      return json(requesterTicket);
    });
    const user = userEvent.setup();
    renderAt("/tickets/1", jennifer, <TicketDetail />, "/tickets/:id");

    const box = await screen.findByPlaceholderText(/add a comment/i);
    await user.type(box, "Still broken after restart");
    await user.click(screen.getByRole("button", { name: "Post" }));

    expect(await screen.findByText(/unable to reach toktickit/i)).toBeInTheDocument();
    expect(box).toHaveValue("Still broken after restart");
  });

  it("sends a staff Internal Note once on a double click (FR-19)", async () => {
    let release!: () => void;
    (fetch as any).mockImplementation((url: string, init: RequestInit = {}) => {
      if (init.method === "POST") return new Promise((resolve) => { release = () => resolve({ ok: true, status: 201, json: async () => ({}) }); });
      if (url.includes("/staff/users")) return json([{ id: 2, name: "Kevin Patel" }]);
      if (/\/(notes|comments|actions|history)$/.test(url)) return json([]);
      return json(staffTicket);
    });
    const user = userEvent.setup();
    renderAt("/staff/tickets/1", kevin, <StaffTicketDetail />, "/staff/tickets/:id");

    await user.type(await screen.findByTestId("note-input"), "Escalated to network team");
    await user.dblClick(screen.getByRole("button", { name: "Add Note" }));

    expect(writes()).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Adding…" })).toBeDisabled();
    release();
    await waitFor(() => expect(screen.getByTestId("note-input")).toHaveValue(""));
  });

  it("shows the shared Not Found screen for a missing staff ticket (FR-18)", async () => {
    (fetch as any).mockImplementation((url: string) =>
      /\/staff\/tickets\/999$/.test(url) ? json({ error: "Ticket not found" }, 404) : json([]));
    renderAt("/staff/tickets/999", kevin, <StaffTicketDetail />, "/staff/tickets/:id");

    expect(await screen.findByRole("heading", { name: "This ticket could not be found" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to Dashboard" })).toHaveAttribute("href", "/dashboard");
  });
});
