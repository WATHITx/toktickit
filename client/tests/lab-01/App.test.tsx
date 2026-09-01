import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import SystemStatusWidget from "../../src/components/SystemStatusWidget";

describe("SystemStatusWidget", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the TokTickIT heading", () => {
    render(<SystemStatusWidget />);
    expect(screen.getByText(/TokTickIT/i)).toBeInTheDocument();
  });

  it("shows Online and the seeded categories on success", async () => {
    (fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "ok", service: "TokTickIT API" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { id: 1, name: "Account and Access" },
          { id: 2, name: "Hardware" },
          { id: 3, name: "Software" },
          { id: 4, name: "Network" },
        ],
      });

    const user = userEvent.setup();
    render(<SystemStatusWidget />);

    await user.click(screen.getByRole("button", { name: /check system/i }));

    expect(await screen.findByText(/online/i)).toBeInTheDocument();
  });

  it("shows an Offline error message when the API is unavailable", async () => {
    (fetch as any).mockRejectedValueOnce(new Error("Network error"));

    const user = userEvent.setup();
    render(<SystemStatusWidget />);

    await user.click(screen.getByRole("button", { name: /check system/i }));

    expect(await screen.findByRole("heading", { name: /offline/i })).toBeInTheDocument();
  });
});