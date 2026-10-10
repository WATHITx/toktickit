// Lab 4 Action Taken field rules (BR-06, BR-07, BR-08). Pure functions so they can be unit tested.

export const ACTION_LIMITS = { description: 2000, result: 2000, followUpNote: 1000, attachmentNotes: 500 };
export const FUTURE_TOLERANCE_MS = 5 * 60 * 1000; // clock-skew allowance for "not in the future"
const MINUTE_MS = 60 * 1000;

export type ActionFields = {
  actionAt: Date;
  description: string;
  result: string | null;
  followUpRequired: boolean;
  followUpNote: string | null;
  attachmentNotes: string | null;
};

type Context = { ticketCreatedAt: Date; now: Date };

const has = (body: Record<string, unknown>, key: string) => body[key] !== undefined;

// Trimmed string, or null when blank. Returns undefined for a non-string so the caller can report it.
function optionalText(raw: unknown): string | null | undefined {
  if (raw === null) return null;
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Parses a create body (no `base`) or a partial update merged onto `base`, and validates the result.
 * Fields absent from `body` keep their `base` value (or the create default).
 */
export function parseActionInput(
  body: Record<string, unknown>,
  ctx: Context,
  base?: ActionFields,
): { value: ActionFields; fields: Record<string, string> } {
  const fields: Record<string, string> = {};

  let actionAt = base?.actionAt ?? ctx.now;
  if (has(body, "actionAt") && body.actionAt !== null) {
    const parsed = new Date(body.actionAt as string);
    if (typeof body.actionAt !== "string" || Number.isNaN(parsed.getTime())) {
      fields.actionAt = "Action Date/Time is not a valid date";
    } else {
      actionAt = parsed;
    }
  }

  let description = base?.description ?? "";
  if (has(body, "description")) {
    description = typeof body.description === "string" ? body.description.trim() : "";
  }

  const text = (key: "result" | "followUpNote" | "attachmentNotes", label: string): string | null => {
    if (!has(body, key)) return base?.[key] ?? null;
    const v = optionalText(body[key]);
    if (v === undefined) {
      fields[key] = `${label} must be text`;
      return null;
    }
    return v;
  };
  const result = text("result", "Result");
  let followUpNote = text("followUpNote", "Follow-up Note");
  const attachmentNotes = text("attachmentNotes", "Attachment Notes");

  let followUpRequired = base?.followUpRequired ?? false;
  if (has(body, "followUpRequired")) {
    if (typeof body.followUpRequired !== "boolean") fields.followUpRequired = "Follow-Up Required must be true or false";
    else followUpRequired = body.followUpRequired;
  }

  // BR-06
  if (description.length === 0) fields.description = "Action Description is required";
  else if (description.length > ACTION_LIMITS.description) fields.description = `Action Description must be ${ACTION_LIMITS.description} characters or fewer`;
  if (result && result.length > ACTION_LIMITS.result) fields.result = `Result must be ${ACTION_LIMITS.result} characters or fewer`;
  if (attachmentNotes && attachmentNotes.length > ACTION_LIMITS.attachmentNotes) {
    fields.attachmentNotes = `Attachment Notes must be ${ACTION_LIMITS.attachmentNotes} characters or fewer`;
  }

  // BR-07
  if (followUpRequired) {
    if (!followUpNote && !fields.followUpNote) fields.followUpNote = "Follow-up Note is required when follow-up is needed";
    else if (followUpNote && followUpNote.length > ACTION_LIMITS.followUpNote) {
      fields.followUpNote = `Follow-up Note must be ${ACTION_LIMITS.followUpNote} characters or fewer`;
    }
  } else {
    followUpNote = null;
  }

  // BR-08 — compared at minute precision, because the date/time control has no seconds
  if (!fields.actionAt) {
    const createdMinute = Math.floor(ctx.ticketCreatedAt.getTime() / MINUTE_MS) * MINUTE_MS;
    if (actionAt.getTime() < createdMinute) {
      fields.actionAt = "Action Date/Time cannot be before the ticket was created";
    } else if (actionAt.getTime() > ctx.now.getTime() + FUTURE_TOLERANCE_MS) {
      fields.actionAt = "Action Date/Time cannot be in the future";
    }
  }

  return { value: { actionAt, description, result, followUpRequired, followUpNote, attachmentNotes }, fields };
}
