import { describe, it, expect } from "vitest";
import { validateTicketInput } from "./ticketValidation";

describe("validateTicketInput", () => {
  it("returns an error when summary is empty", () => {
    const errors = validateTicketInput({ summary: "", description: "valid", requestedPriority: "LOW", categoryId: 1, relatedSystemId: 1, requesterId: 1 });
    expect(errors.summary).toBeDefined();
  });

  it("returns an error when summary exceeds 150 characters", () => {
    const longSummary = "a".repeat(151);
    const errors = validateTicketInput({ summary: longSummary, description: "valid", requestedPriority: "LOW", categoryId: 1, relatedSystemId: 1, requesterId: 1 });
    expect(errors.summary).toBeDefined();
  });

  it("returns an error for an invalid priority", () => {
    const errors = validateTicketInput({ summary: "valid", description: "valid", requestedPriority: "URGENT", categoryId: 1, relatedSystemId: 1, requesterId: 1 });
    expect(errors.requestedPriority).toBeDefined();
  });

  it("returns no errors for valid input", () => {
    const errors = validateTicketInput({ summary: "valid", description: "valid", requestedPriority: "MEDIUM", categoryId: 1, relatedSystemId: 1, requesterId: 1 });
    expect(Object.keys(errors).length).toBe(0);
  });
});