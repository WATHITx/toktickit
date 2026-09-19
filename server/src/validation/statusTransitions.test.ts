import { describe, it, expect } from "vitest";
import { isValidTransition } from "./statusTransitions";

describe("isValidTransition", () => {
  it("allows NEW to OPEN", () => {
    expect(isValidTransition("NEW", "OPEN")).toBe(true);
  });

  it("rejects NEW directly to CLOSED", () => {
    expect(isValidTransition("NEW", "CLOSED")).toBe(false);
  });

  it("rejects any transition out of CANCELLED", () => {
    expect(isValidTransition("CANCELLED", "OPEN")).toBe(false);
  });

  it("allows CLOSED to REOPENED only", () => {
    expect(isValidTransition("CLOSED", "REOPENED")).toBe(true);
    expect(isValidTransition("CLOSED", "OPEN")).toBe(false);
  });
});