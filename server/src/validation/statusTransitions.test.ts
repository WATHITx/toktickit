import { describe, it, expect } from "vitest";
import { isValidTransition, canTransition, allowedTransitions, TICKET_STATUSES } from "./statusTransitions";

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

// UNIT-01 (BR-12, BR-13, BR-14): the Lab 4 matrix with authorized roles (docs/lab-04/api-spec.md)
describe("canTransition by role (UNIT-01)", () => {
  const STAFF_MATRIX: Record<string, string[]> = {
    NEW: ["OPEN", "IN_PROGRESS", "CANCELLED"],
    OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "CANCELLED"],
    IN_PROGRESS: ["OPEN", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
    WAITING_FOR_REQUESTER: ["OPEN", "IN_PROGRESS", "CANCELLED"],
    RESOLVED: ["IN_PROGRESS", "CLOSED", "REOPENED"],
    CLOSED: ["REOPENED"],
    REOPENED: ["OPEN", "IN_PROGRESS", "CANCELLED"],
    CANCELLED: [],
  };
  const REQUESTER_MATRIX: Record<string, string[]> = { RESOLVED: ["REOPENED"], CLOSED: ["REOPENED"] };

  it("permits exactly the documented transitions for IT Staff and Administrators", () => {
    for (const role of ["IT_STAFF", "ADMINISTRATOR"]) {
      for (const from of TICKET_STATUSES) {
        for (const to of TICKET_STATUSES) {
          expect(canTransition(from, to, role), `${role} ${from}→${to}`).toBe((STAFF_MATRIX[from] ?? []).includes(to));
        }
      }
    }
  });

  it("only lets a Requester reopen a Resolved or Closed ticket (BR-13)", () => {
    for (const from of TICKET_STATUSES) {
      for (const to of TICKET_STATUSES) {
        expect(canTransition(from, to, "REQUESTER"), `REQUESTER ${from}→${to}`).toBe((REQUESTER_MATRIX[from] ?? []).includes(to));
      }
    }
  });

  it("treats Cancelled as terminal and Closed as reopen-only for every role (BR-14)", () => {
    for (const role of ["REQUESTER", "IT_STAFF", "ADMINISTRATOR"]) {
      expect(allowedTransitions("CANCELLED", role)).toEqual([]);
      expect(allowedTransitions("CLOSED", role)).toEqual(["REOPENED"]);
    }
  });

  it("rejects unknown statuses and roles", () => {
    expect(canTransition("NEW", "DONE", "IT_STAFF")).toBe(false);
    expect(canTransition("LIMBO", "OPEN", "IT_STAFF")).toBe(false);
    expect(canTransition("NEW", "OPEN", "GUEST")).toBe(false);
  });
});
