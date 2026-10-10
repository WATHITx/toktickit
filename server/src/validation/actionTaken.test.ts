import { describe, it, expect } from "vitest";
import { parseActionInput, ACTION_LIMITS, FUTURE_TOLERANCE_MS } from "./actionTaken";

const ticketCreatedAt = new Date("2026-10-01T00:00:00.000Z");
const now = new Date("2026-10-09T12:00:00.000Z");
const ctx = { ticketCreatedAt, now };

describe("parseActionInput (UNIT-03)", () => {
  it("accepts a minimal valid action and applies defaults (BR-06, BR-08)", () => {
    const { value, fields } = parseActionInput({ description: "  Reset VPN profile  " }, ctx);
    expect(fields).toEqual({});
    expect(value).toEqual({
      actionAt: now,
      description: "Reset VPN profile",
      result: null,
      followUpRequired: false,
      followUpNote: null,
      attachmentNotes: null,
    });
  });

  it("requires a non-blank description within the length limit (BR-06)", () => {
    expect(parseActionInput({ description: "   " }, ctx).fields.description).toBeDefined();
    expect(parseActionInput({}, ctx).fields.description).toBeDefined();
    const tooLong = "x".repeat(ACTION_LIMITS.description + 1);
    expect(parseActionInput({ description: tooLong }, ctx).fields.description).toBeDefined();
  });

  it("enforces optional field limits (BR-06)", () => {
    const { fields } = parseActionInput({
      description: "ok",
      result: "r".repeat(ACTION_LIMITS.result + 1),
      attachmentNotes: "a".repeat(ACTION_LIMITS.attachmentNotes + 1),
    }, ctx);
    expect(Object.keys(fields).sort()).toEqual(["attachmentNotes", "result"]);
  });

  it("requires a Follow-up Note only when follow-up is required (BR-07)", () => {
    expect(parseActionInput({ description: "ok", followUpRequired: true }, ctx).fields.followUpNote).toBeDefined();
    expect(parseActionInput({ description: "ok", followUpRequired: true, followUpNote: "  " }, ctx).fields.followUpNote).toBeDefined();
    const ok = parseActionInput({ description: "ok", followUpRequired: true, followUpNote: "Check tomorrow" }, ctx);
    expect(ok.fields).toEqual({});
    expect(ok.value.followUpNote).toBe("Check tomorrow");
  });

  it("clears the Follow-up Note when follow-up is not required (BR-07)", () => {
    const { value } = parseActionInput({ description: "ok", followUpRequired: false, followUpNote: "stale" }, ctx);
    expect(value.followUpNote).toBeNull();
  });

  it("rejects a non-boolean followUpRequired", () => {
    expect(parseActionInput({ description: "ok", followUpRequired: "yes" }, ctx).fields.followUpRequired).toBeDefined();
  });

  it("rejects an Action Date/Time before the Ticket was created (BR-08)", () => {
    const { fields } = parseActionInput({ description: "ok", actionAt: "2026-09-30T23:59:00.000Z" }, ctx);
    expect(fields.actionAt).toBeDefined();
  });

  it("compares the creation time at minute precision (date/time control has no seconds) (BR-08)", () => {
    const created = new Date("2026-10-09T12:57:30.000Z");
    const now = new Date("2026-10-09T13:00:00.000Z");
    const sameMinute = parseActionInput({ description: "ok", actionAt: "2026-10-09T12:57:00.000Z" }, { ticketCreatedAt: created, now });
    const minuteBefore = parseActionInput({ description: "ok", actionAt: "2026-10-09T12:56:59.000Z" }, { ticketCreatedAt: created, now });
    expect(sameMinute.fields).toEqual({});
    expect(minuteBefore.fields.actionAt).toBeDefined();
  });

  it("allows small clock skew but rejects times further in the future (BR-08)", () => {
    const withinSkew = new Date(now.getTime() + FUTURE_TOLERANCE_MS - 1000).toISOString();
    const tooFar = new Date(now.getTime() + FUTURE_TOLERANCE_MS + 1000).toISOString();
    expect(parseActionInput({ description: "ok", actionAt: withinSkew }, ctx).fields).toEqual({});
    expect(parseActionInput({ description: "ok", actionAt: tooFar }, ctx).fields.actionAt).toBeDefined();
  });

  it("rejects an unparseable Action Date/Time", () => {
    expect(parseActionInput({ description: "ok", actionAt: "not a date" }, ctx).fields.actionAt).toBeDefined();
  });

  it("merges a partial update onto the existing values", () => {
    const base = {
      actionAt: new Date("2026-10-05T00:00:00.000Z"), description: "Original", result: null,
      followUpRequired: true, followUpNote: "Call back", attachmentNotes: "photo.png",
    };
    const { value, fields } = parseActionInput({ result: "Fixed" }, ctx, base);
    expect(fields).toEqual({});
    expect(value).toEqual({ ...base, result: "Fixed" });
  });

  it("treats empty optional strings as cleared values", () => {
    const base = {
      actionAt: ticketCreatedAt, description: "Original", result: "Done",
      followUpRequired: false, followUpNote: null, attachmentNotes: "photo.png",
    };
    const { value } = parseActionInput({ result: "", attachmentNotes: "  " }, ctx, base);
    expect(value.result).toBeNull();
    expect(value.attachmentNotes).toBeNull();
  });
});
