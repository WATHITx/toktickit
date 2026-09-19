import { describe, it, expect } from "vitest";
import { formatTicketNumber } from "./ticketNumber";

describe("formatTicketNumber", () => {
  it("formats with 6-digit zero-padded sequence and current year", () => {
    const year = new Date().getFullYear();
    expect(formatTicketNumber(42)).toBe(`TKT-${year}-000042`);
  });

  it("handles large sequence numbers without truncation", () => {
    const year = new Date().getFullYear();
    expect(formatTicketNumber(1234567)).toBe(`TKT-${year}-1234567`);
  });
});