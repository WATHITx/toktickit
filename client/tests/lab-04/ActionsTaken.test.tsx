import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AuthContext } from "../../src/context/AuthContext";
import ActionsTaken, { ActionTaken } from "../../src/components/ActionsTaken";

const kevin = { id: 2, name: "Kevin Patel", email: "kevin.p@test.com", role: "IT_STAFF" };
const jennifer = { id: 1, name: "Jennifer Anderson", email: "j@test.com", role: "REQUESTER" };
const staffUsers = [{ id: 2, name: "Kevin Patel" }, { id: 3, name: "Emily Davis" }];

const action = (overrides: Partial<ActionTaken>): ActionTaken => ({
  id: 1, ticketId: 10, actionAt: "2026-10-09T03:00:00.000Z", description: "Checked logs", result: null,
  followUpRequired: false, followUpNote: null, attachmentNotes: null, status: "PLANNED",
  performedBy: { id: 2, name: "Kevin Patel" }, assignee: { id: 2, name: "Kevin Patel" }, version: 1,
  ...overrides,
});

const json = (body: unknown, status = 200) => Promise.resolve({ ok: status < 400, status, json: async () => body });

/** fetch mock: GET returns `list`; non-GET calls go to `onWrite`. */
function mockFetch(list: ActionTaken[], onWrite: (url: string, init: RequestInit) => Promise<unknown> = () => json({}, 201)) {
  (fetch as any).mockImplementation((url: string, init: RequestInit = {}) =>
    !init.method || init.method === "GET" ? json(list) : onWrite(url, init));
}

const writes = () => (fetch as any).mock.calls.filter(([, init]: [string, RequestInit]) => init?.method && init.method !== "GET");
const bodyOf = (call: [string, RequestInit]) => JSON.parse(call[1].body as string);

function renderCard(props: Partial<React.ComponentProps<typeof ActionsTaken>> = {}, user = kevin) {
  return render(
    <AuthContext.Provider value={{ user, loading: false, refreshUser: vi.fn(), setUser: vi.fn() }}>
      <ActionsTaken ticketId={10} ticketStatus="IN_PROGRESS" mode="staff" staffUsers={staffUsers} {...props} />
    </AuthContext.Provider>
  );
}

describe("ActionsTaken", () => {
  beforeEach(() => { vi.stubGlobal("fetch", vi.fn()); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it("shows the Follow-up Note only when follow-up is required and displays the server's field error (UI-05, AC-03)", async () => {
    mockFetch([], () => json({ error: "Please correct the highlighted fields", code: "VALIDATION",
      fields: { followUpNote: "Follow-up Note is required when follow-up is needed" } }, 400));
    const user = userEvent.setup();
    renderCard();

    expect(await screen.findByText(/no actions recorded yet/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "+ Add Action" }));

    expect(screen.getByLabelText(/action description/i)).toHaveFocus();
    expect(screen.getByText("Performed by")).toBeInTheDocument();
    expect(screen.queryByLabelText(/follow-up note/i)).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(/action description/i), "Reset VPN profile");
    await user.click(screen.getByLabelText(/follow-up required/i));
    const note = screen.getByLabelText(/follow-up note/i);
    expect(note).toHaveAttribute("aria-required", "true");
    await waitFor(() => expect(note).toHaveFocus());

    await user.click(screen.getByRole("button", { name: "Save Action" }));

    expect(await screen.findByText("Follow-up Note is required when follow-up is needed")).toBeInTheDocument();
    expect(screen.getByLabelText(/follow-up note/i)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText(/action description/i)).toHaveValue("Reset VPN profile");
    expect(bodyOf(writes()[0])).toMatchObject({ description: "Reset VPN profile", followUpRequired: true, assigneeId: 2 });
  });

  it("creates an action with the chosen assignee and refreshes the list", async () => {
    let list: ActionTaken[] = [];
    (fetch as any).mockImplementation((_url: string, init: RequestInit = {}) => {
      if (init.method === "POST") {
        list = [action({ description: "Hand over", assignee: { id: 3, name: "Emily Davis" } })];
        return json(list[0], 201);
      }
      return json(list);
    });
    const user = userEvent.setup();
    renderCard();

    await user.click(await screen.findByRole("button", { name: "+ Add Action" }));
    await user.type(screen.getByLabelText(/action description/i), "Hand over");
    await user.selectOptions(screen.getByLabelText("Assignee"), "3");
    await user.click(screen.getByRole("button", { name: "Save Action" }));

    expect(await screen.findByText("Action saved")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Actions Taken (1)" })).toBeInTheDocument();
    expect(within(screen.getByTestId("action-row")).getByText("Emily Davis")).toBeInTheDocument();
    expect(bodyOf(writes()[0]).assigneeId).toBe(3);
  });

  it("lets Planned actions be edited, completed or cancelled and keeps finished actions read-only (UI-06, BR-09)", async () => {
    mockFetch([
      action({ id: 1, description: "Planned work", status: "PLANNED", version: 4 }),
      action({ id: 2, description: "Finished work", status: "COMPLETED", result: "Fixed" }),
      action({ id: 3, description: "Dropped work", status: "CANCELLED" }),
    ], () => json({}));
    const user = userEvent.setup();
    renderCard();

    const rows = await screen.findAllByTestId("action-row");
    expect(within(rows[0]).getByText("Planned")).toBeInTheDocument();
    expect(within(rows[1]).getByText("Completed")).toBeInTheDocument();
    expect(within(rows[2]).getByText("Cancelled")).toBeInTheDocument();

    // Completed: read-only
    await user.click(within(rows[1]).getByRole("button", { name: "View" }));
    expect(within(rows[1]).getByText("Fixed")).toBeInTheDocument();
    expect(within(rows[1]).queryByRole("button", { name: /save|mark completed|cancel action/i })).not.toBeInTheDocument();
    expect(within(rows[1]).queryByRole("textbox")).not.toBeInTheDocument();
    expect(within(rows[2]).getByRole("button", { name: "View" })).toBeInTheDocument();

    // Planned: editable, cancel needs confirmation and sends the version
    await user.click(within(rows[0]).getByRole("button", { name: "Edit" }));
    expect(within(rows[0]).getByLabelText(/action description/i)).toHaveValue("Planned work");
    await user.click(within(rows[0]).getByRole("button", { name: "Cancel Action" }));
    expect(writes()).toHaveLength(0);
    await user.click(within(rows[0]).getByRole("button", { name: "Yes, cancel action" }));

    await waitFor(() => expect(writes()).toHaveLength(1));
    expect(writes()[0][0]).toBe("/api/staff/tickets/10/actions/1");
    expect(bodyOf(writes()[0])).toEqual({ expectedVersion: 4, status: "CANCELLED" });
  });

  it("sends the Result and status COMPLETED when marking an action complete", async () => {
    mockFetch([action({ id: 7, version: 2 })], () => json({}));
    const user = userEvent.setup();
    renderCard();

    await user.click(await screen.findByRole("button", { name: "Edit" }));
    await user.type(screen.getByLabelText(/^result/i), "Link is stable");
    await user.click(screen.getByRole("button", { name: "Mark Completed" }));

    await waitFor(() => expect(writes()).toHaveLength(1));
    expect(bodyOf(writes()[0])).toMatchObject({ expectedVersion: 2, status: "COMPLETED", result: "Link is stable" });
  });

  it("shows the Requester a read-only list from the Requester endpoint (UI-07, AC-06)", async () => {
    mockFetch([action({ description: "Replaced cable", status: "COMPLETED", result: "Works", followUpRequired: true, followUpNote: "Recheck Friday" })]);
    const user = userEvent.setup();
    renderCard({ mode: "requester", staffUsers: [] }, jennifer);

    expect(await screen.findByRole("heading", { name: "Work Performed by IT" })).toBeInTheDocument();
    expect((fetch as any).mock.calls[0][0]).toBe("/api/tickets/10/actions");
    expect(screen.queryByRole("button", { name: "+ Add Action" })).not.toBeInTheDocument();
    expect(screen.getByText("Follow-up")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "View" }));
    expect(screen.getByText("Recheck Friday")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /edit|save|mark completed|cancel action/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("shows the Requester empty state", async () => {
    mockFetch([]);
    renderCard({ mode: "requester", staffUsers: [] }, jennifer);
    expect(await screen.findByText("IT has not recorded any actions yet.")).toBeInTheDocument();
  });

  it("sends one request on a double click and keeps entered data after a network failure (UI-08, AC-19)", async () => {
    let rejectPost!: (e: Error) => void;
    mockFetch([], () => new Promise((_resolve, reject) => { rejectPost = reject; }));
    const user = userEvent.setup();
    renderCard();

    await user.click(await screen.findByRole("button", { name: "+ Add Action" }));
    await user.type(screen.getByLabelText(/action description/i), "Do not lose me");
    const save = screen.getByRole("button", { name: "Save Action" });
    await user.dblClick(save);

    expect(writes()).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();

    rejectPost(new TypeError("Failed to fetch"));
    expect(await screen.findByText(/unable to reach toktickit/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/action description/i)).toHaveValue("Do not lose me");
    expect(screen.getByRole("button", { name: "Save Action" })).toBeEnabled();
  });

  it("shows a conflict banner on 409 and reloads the list (AC-10)", async () => {
    mockFetch([action({ id: 5, version: 1 })], () =>
      json({ error: "This action was changed by someone else.", code: "STALE_UPDATE", currentVersion: 2 }, 409));
    const user = userEvent.setup();
    renderCard();

    await user.click(await screen.findByRole("button", { name: "Edit" }));
    await user.clear(screen.getByLabelText(/action description/i));
    await user.type(screen.getByLabelText(/action description/i), "My edit");
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(await screen.findByText(/changed by someone else/i)).toBeInTheDocument();
    const getsBefore = (fetch as any).mock.calls.length - writes().length;
    await user.click(screen.getByRole("button", { name: "Reload" }));
    await waitFor(() => expect((fetch as any).mock.calls.length - writes().length).toBe(getsBefore + 1));
    expect(screen.getByLabelText(/action description/i)).toHaveValue("My edit");
  });

  it("hides write controls on a Closed ticket (BR-10)", async () => {
    mockFetch([action({ status: "PLANNED" })]);
    renderCard({ ticketStatus: "CLOSED" });

    expect(await screen.findByText(/this ticket is closed/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "+ Add Action" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View" })).toBeInTheDocument();
  });
});
