// BR-11 resolution gate: a Ticket may move to Resolved only with an owner, at least one Completed
// Action Taken, and no Planned Action Taken. Returns every missing condition so the UI can list them.

type GateInput = {
  ticketOwnerId: number | null;
  actions: { status: string }[];
};

export type GateResult = { ok: boolean; reasons: string[] };

export function checkResolutionGate({ ticketOwnerId, actions }: GateInput): GateResult {
  const reasons: string[] = [];
  const completed = actions.filter((a) => a.status === "COMPLETED").length;
  const planned = actions.filter((a) => a.status === "PLANNED").length;

  if (ticketOwnerId === null) reasons.push("Assign a Ticket Owner");
  if (completed === 0) reasons.push("Complete at least one Action Taken");
  if (planned > 0) reasons.push(`Finish or cancel ${planned} planned ${planned === 1 ? "Action Taken" : "Actions Taken"}`);

  return { ok: reasons.length === 0, reasons };
}
