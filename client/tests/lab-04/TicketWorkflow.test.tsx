import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthContext } from "../../src/context/AuthContext";
import StaffTicketDetail from "../../src/pages/StaffTicketDetail";
import TicketDetail from "../../src/pages/TicketDetail";

const kevin = { id: 2, name: "Kevin Patel", email: "kevin.p@test.com", role: "IT_STAFF" };
const jennifer = { id: 1, name: "Jennifer Anderson", email: "j@test.com", role: "REQUESTER" };

const staffTicket = (overrides: Record<string, unknown> = {}) => ({
  id: 1, ticketNumber: "TKT-1", summary: "VPN drops", description: "d",
  category: { name: "Network" }, relatedSystem: { name: "VPN" },
  requester: { id: 1, name: "Jennifer Anderson" }, requestedPriority: "LOW", itPriority: "LOW",
  currentStatus: "NEW", ticketOwner: null, problemAppearsResolved: false, version: 3,
  resolutionGate: { ok: true, reasons: [] },
  ...overrides,
});

const requesterTicket = (overrides: Record<string, unknown> = {}) => ({
  id: 1, ticketNumber: "TKT-1", summary: "VPN drops", description: "d",
  category: { name: "Network" }, relatedSystem: { name: "VPN" },
  requestedPriority: "LOW", currentStatus: "RESOLVED", problemAppearsResolved: false,
  createdAt: new Date().toISOString(), requesterId: 1, attachments: [], version: 5,
  ...overrides,
});

const json = (body: unknown, status = 200) => Promise.resolve({ ok: status < 400, status, json: async () => body });

/** Routes GETs by URL; `write` answers PATCH/POST calls. `ticket` is a function so a test can change it mid-way. */
function mockApi(ticket: () => unknown, write: (url: string, body: any) => Promise<unknown> = () => json({})) {
  (fetch as any).mockImplementation((url: string, init: RequestInit = {}) => {
    if (init.method && init.method !== "GET") return write(url, JSON.parse((init.body as string) ?? "{}"));
    if (url.includes("/staff/users")) return json([{ id: 2, name: "Kevin Patel" }]);
    if (/\/(notes|comments|actions|history)$/.test(url)) return json([]);
    return json(ticket());
  });
}

const writes = () => (fetch as any).mock.calls.filter(([, init]: [string, RequestInit]) => init?.method && init.method !== "GET");
const ticketGets = () => (fetch as any).mock.calls.filter(([url, init]: [string, RequestInit]) =>
  (!init?.method || init.method === "GET") && /\/tickets\/1$/.test(url)).length;

function renderStaff() {
  return render(
    <MemoryRouter initialEntries={["/staff/tickets/1"]}>
      <AuthContext.Provider value={{ user: kevin, loading: false, refreshUser: vi.fn(), setUser: vi.fn() }}>
        <Routes><Route path="/staff/tickets/:id" element={<StaffTicketDetail />} /></Routes>
      </AuthContext.Provider>
    </MemoryRouter>
  );
}

function renderRequester() {
  return render(
    <MemoryRouter initialEntries={["/tickets/1"]}>
      <AuthContext.Provider value={{ user: jennifer, loading: false, refreshUser: vi.fn(), setUser: vi.fn() }}>
        <Routes><Route path="/tickets/:id" element={<TicketDetail />} /></Routes>
      </AuthContext.Provider>
    </MemoryRouter>
  );
}

describe("Ticket workflow UI", () => {
  beforeEach(() => { vi.stubGlobal("fetch", vi.fn()); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it("lists only the transitions IT Staff may make, with readable labels (UI-09, BR-12)", async () => {
    mockApi(() => staffTicket({ currentStatus: "RESOLVED" }));
    renderStaff();

    const select = await screen.findByTestId("status-select");
    const options = within(select).getAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual(["Resolved (current)", "In Progress", "Closed", "Reopened"]);
    expect(screen.getByTestId("ticket-status-badge")).toHaveTextContent("Resolved");
  });

  it("disables the status control on a Cancelled ticket (BR-14)", async () => {
    mockApi(() => staffTicket({ currentStatus: "CANCELLED" }));
    renderStaff();
    expect(await screen.findByTestId("status-select")).toBeDisabled();
  });

  it("stages a status change, saves it with the ticket version on Confirm, and refreshes the badge (FR-06, BR-17)", async () => {
    let current = staffTicket();
    mockApi(() => current, (_url, body) => {
      current = staffTicket({ currentStatus: body.status, version: 4 });
      return json(current);
    });
    const user = userEvent.setup();
    renderStaff();

    await user.selectOptions(await screen.findByTestId("status-select"), "OPEN");
    expect(writes()).toHaveLength(0);
    expect(screen.getByText("Change status to Open?")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(writes()).toHaveLength(1));
    expect(writes()[0][0]).toBe("/api/staff/tickets/1/status");
    expect(JSON.parse(writes()[0][1].body)).toEqual({ status: "OPEN", expectedVersion: 3 });
    expect(await screen.findByText("Status changed to Open")).toBeInTheDocument();
    expect(screen.getByTestId("ticket-status-badge")).toHaveTextContent("Open");
  });

  it("cancelling the confirm row does not save", async () => {
    mockApi(() => staffTicket());
    const user = userEvent.setup();
    renderStaff();

    await user.selectOptions(await screen.findByTestId("status-select"), "CANCELLED");
    await user.click(within(screen.getByTestId("status-confirm")).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByTestId("status-confirm")).not.toBeInTheDocument();
    expect(screen.getByTestId("status-select")).toHaveValue("NEW");
    expect(writes()).toHaveLength(0);
  });

  it("explains the resolution gate before and after a blocked attempt (UI-10, AC-07)", async () => {
    mockApi(
      () => staffTicket({ currentStatus: "IN_PROGRESS", resolutionGate: { ok: false, reasons: ["Complete at least one Action Taken"] } }),
      () => json({ error: "This ticket cannot be resolved yet.", code: "RESOLUTION_GATE",
        reasons: ["Complete at least one Action Taken", "Assign a Ticket Owner"] }, 400),
    );
    const user = userEvent.setup();
    renderStaff();

    expect(await screen.findByTestId("gate-hint")).toHaveTextContent("Complete at least one Action Taken");

    await user.selectOptions(screen.getByTestId("status-select"), "RESOLVED");
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    const alert = await screen.findByText("This ticket cannot be resolved yet.");
    expect(alert).toHaveTextContent("Assign a Ticket Owner");
    expect(screen.getByTestId("ticket-status-badge")).toHaveTextContent("In Progress");
  });

  it("shows a conflict banner on 409 and reloads the ticket (UI-11, AC-10)", async () => {
    mockApi(() => staffTicket(), () => json({ error: "changed", code: "STALE_UPDATE", currentVersion: 4 }, 409));
    const user = userEvent.setup();
    renderStaff();

    await user.selectOptions(await screen.findByTestId("status-select"), "OPEN");
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    expect(await screen.findByText("This ticket was changed by someone else.")).toBeInTheDocument();

    const before = ticketGets();
    await user.click(screen.getByRole("button", { name: "Reload" }));
    await waitFor(() => expect(ticketGets()).toBe(before + 1));
    expect(screen.queryByText("This ticket was changed by someone else.")).not.toBeInTheDocument();
  });

  it("lets the Requester reopen a Resolved ticket after confirming (FR-08, AC-15)", async () => {
    let current = requesterTicket();
    mockApi(() => current, () => {
      current = requesterTicket({ currentStatus: "REOPENED", version: 6 });
      return json(current);
    });
    const user = userEvent.setup();
    renderRequester();

    await user.click(await screen.findByRole("button", { name: "Reopen Ticket" }));
    expect(writes()).toHaveLength(0);
    await user.click(screen.getByRole("button", { name: "Yes, reopen" }));

    await waitFor(() => expect(writes()).toHaveLength(1));
    expect(writes()[0][0]).toBe("/api/tickets/1/reopen");
    expect(JSON.parse(writes()[0][1].body)).toEqual({ expectedVersion: 5 });
    expect(await screen.findByTestId("ticket-status-badge")).toHaveTextContent("Reopened");
    expect(screen.queryByRole("button", { name: "Reopen Ticket" })).not.toBeInTheDocument();
  });

  it("does not offer Reopen on an active ticket and keeps the resolved hint advisory (BR-13, BR-15)", async () => {
    mockApi(() => requesterTicket({ currentStatus: "IN_PROGRESS" }));
    renderRequester();

    expect(await screen.findByTestId("ticket-status-badge")).toHaveTextContent("In Progress");
    expect(screen.queryByRole("button", { name: "Reopen Ticket" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /mark problem as resolved/i })).toHaveAttribute("title", expect.stringMatching(/formally resolves/i));
  });
});
