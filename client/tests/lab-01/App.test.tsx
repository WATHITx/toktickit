import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

describe("App", () => {
  it("renders the TokTickIT heading", () => {
    render(<App />);
    expect(screen.getByText(/TokTickIT/i)).toBeInTheDocument();
  });

  it("shows Online and the seeded categories on success", async () => {
    vi.spyOn(api, "checkSystem").mockResolvedValue({
      online: true,
      categories: [
        { id: 1, name: "Account and Access" },
        { id: 2, name: "Hardware" },
      ],
    });

    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /check system/i }));

    expect(await screen.findByText(/online/i)).toBeInTheDocument();
    expect(screen.getByText("Account and Access")).toBeInTheDocument();
    expect(screen.getByText("Hardware")).toBeInTheDocument();
  });

  it("shows an Offline error message when the API is unavailable", async () => {
    vi.spyOn(api, "checkSystem").mockRejectedValue(new Error("offline"));

    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /check system/i }));

    expect(await screen.findByRole("heading", { name: /offline/i })).toBeInTheDocument();
    expect(screen.getByText(/the system is currently offline\./i)).toBeInTheDocument();
  });
});
