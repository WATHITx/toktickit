import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import TicketDetail from "./TicketDetail";

const mockUser = { id: 1, name: "Jennifer Anderson", email: "j@test.com", role: "REQUESTER" };

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/tickets/1"]}>
      <AuthContext.Provider value={{ user: mockUser, loading: false, refreshUser: vi.fn(), setUser: vi.fn() }}>
        <Routes>
          <Route path="/tickets/:id" element={<TicketDetail />} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>
  );
}

describe("TicketDetail", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders ticket fields as read-only (UI-08)", async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 1, ticketNumber: "TKT-1", summary: "Test summary", description: "Test description",
        category: { name: "Hardware" }, relatedSystem: { name: "Laptop" },
        requestedPriority: "MEDIUM", currentStatus: "NEW", createdAt: new Date().toISOString(),
        requesterId: 1, attachments: [],
      }),
    });

    renderPage();

    await waitFor(() => screen.getByText("Test summary"));
    // field เป็น <p> ไม่ใช่ <input> จึงไม่มี role "textbox" ให้แก้ไข
    expect(screen.queryByRole("textbox", { name: /summary/i })).not.toBeInTheDocument();
  });

  it("hides download/remove controls for a removed attachment (UI-09)", async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 1, ticketNumber: "TKT-1", summary: "s", description: "d",
        category: { name: "Hardware" }, relatedSystem: { name: "Laptop" },
        requestedPriority: "LOW", currentStatus: "NEW", createdAt: new Date().toISOString(),
        requesterId: 1,
        attachments: [
          { id: 5, fileName: "old-file.jpg", fileType: "image/jpeg", fileSize: 1000, isRemoved: true, removedReason: "wrong file", createdAt: new Date().toISOString() },
        ],
      }),
    });

    renderPage();

    await waitFor(() => screen.getByText("old-file.jpg"));
    expect(screen.getByText(/removed/i)).toBeInTheDocument();
    expect(screen.queryByText("Download")).not.toBeInTheDocument();
  });

  it("shows public comment controls and resolution action for requesters", async () => {
    (fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 1, ticketNumber: "TKT-1", summary: "s", description: "d",
          category: { name: "Hardware" }, relatedSystem: { name: "Laptop" },
          requestedPriority: "LOW", currentStatus: "NEW", problemAppearsResolved: false,
          createdAt: new Date().toISOString(), requesterId: 1, attachments: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

    renderPage();

    await waitFor(() => screen.getByText("Public Comments"));
    expect(screen.getByRole("button", { name: /mark problem as resolved/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/add a comment/i)).toBeInTheDocument();
  });
});