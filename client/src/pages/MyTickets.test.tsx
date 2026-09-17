import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import MyTickets from "./MyTickets";

const mockUser = { id: 1, name: "Jennifer Anderson", email: "j@test.com", role: "REQUESTER" };

function renderPage() {
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={{ user: mockUser, loading: false, refreshUser: vi.fn(), setUser: vi.fn() }}>
        <MyTickets />
      </AuthContext.Provider>
    </MemoryRouter>
  );
}

describe("MyTickets", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows empty state when the requester has zero tickets (UI-06)", async () => {
    (fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => [{ id: 1, name: "Hardware" }] }) // categories
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [], pagination: { totalPages: 1 } }) }); // tickets

    renderPage();

    expect(await screen.findByText(/haven't created any tickets/i)).toBeInTheDocument();
  });

  it("shows no-results state when a search matches nothing (UI-07)", async () => {
    let currentSearch = "";

    (fetch as any).mockImplementation((url: string) => {
      if (url.includes("/api/categories")) {
        return Promise.resolve({ ok: true, json: async () => [{ id: 1, name: "Hardware" }] });
      }
      if (url.includes("/api/tickets")) {
        const params = new URLSearchParams(url.split("?")[1]);
        currentSearch = params.get("search") || "";

        if (currentSearch === "nomatch") {
          return Promise.resolve({ ok: true, json: async () => ({ data: [], pagination: { totalPages: 1 } }) });
        }

        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: [{
              id: 1,
              ticketNumber: "TKT-1",
              summary: "a",
              category: { name: "Hardware" },
              requestedPriority: "LOW",
              currentStatus: "NEW",
              createdAt: new Date().toISOString(),
            }],
            pagination: { totalPages: 1 },
          }),
        });
      }

      return Promise.reject(new Error(`Unexpected fetch: ${url}`));
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getAllByText("TKT-1").length).toBeGreaterThan(0);
    });

    const searchInput = screen.getByPlaceholderText(/search by ticket number/i);
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    await user.type(searchInput, "nomatch");

    expect(await screen.findByText(/no tickets match/i)).toBeInTheDocument();
  });
});