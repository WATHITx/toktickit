import { describe, it, expect } from "vitest";
import { checkResolutionGate } from "./resolutionGate";

// UNIT-02 (BR-11): owner + at least one Completed action + no Planned action
describe("checkResolutionGate (UNIT-02)", () => {
  it("passes when the ticket has an owner, a completed action and nothing planned", () => {
    const gate = checkResolutionGate({ ticketOwnerId: 3, actions: [{ status: "COMPLETED" }, { status: "CANCELLED" }] });
    expect(gate).toEqual({ ok: true, reasons: [] });
  });

  it("requires a Ticket Owner", () => {
    const gate = checkResolutionGate({ ticketOwnerId: null, actions: [{ status: "COMPLETED" }] });
    expect(gate.ok).toBe(false);
    expect(gate.reasons).toEqual(["Assign a Ticket Owner"]);
  });

  it("requires at least one Completed action (cancelled ones do not count)", () => {
    expect(checkResolutionGate({ ticketOwnerId: 3, actions: [] }).reasons).toEqual(["Complete at least one Action Taken"]);
    expect(checkResolutionGate({ ticketOwnerId: 3, actions: [{ status: "CANCELLED" }] }).reasons)
      .toEqual(["Complete at least one Action Taken"]);
  });

  it("blocks while any action is still Planned, with a count", () => {
    expect(checkResolutionGate({ ticketOwnerId: 3, actions: [{ status: "COMPLETED" }, { status: "PLANNED" }] }).reasons)
      .toEqual(["Finish or cancel 1 planned Action Taken"]);
    expect(checkResolutionGate({ ticketOwnerId: 3, actions: [{ status: "COMPLETED" }, { status: "PLANNED" }, { status: "PLANNED" }] }).reasons)
      .toEqual(["Finish or cancel 2 planned Actions Taken"]);
  });

  it("lists every missing condition at once", () => {
    const gate = checkResolutionGate({ ticketOwnerId: null, actions: [{ status: "PLANNED" }] });
    expect(gate.reasons).toEqual([
      "Assign a Ticket Owner",
      "Complete at least one Action Taken",
      "Finish or cancel 1 planned Action Taken",
    ]);
  });
});
