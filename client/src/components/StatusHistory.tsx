import { useCallback, useEffect, useState } from "react";
import { apiGet } from "../api/client";
import { TICKET_STATUS_LABELS, formatDateTime } from "../utils/format";

// Append-only status history card (docs/lab-04/ui-spec.md Section 8). Newest entry first for reading.

type HistoryEntry = {
  id: number;
  fromStatus: string;
  toStatus: string;
  changedAt: string;
  changedBy: { id: number; name: string };
};

type Props = {
  ticketId: number;
  mode: "staff" | "requester";
  /** Change it (e.g. the ticket version) to reload after a status change. */
  refreshKey?: unknown;
};

export default function StatusHistory({ ticketId, mode, refreshKey }: Props) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading");

  const load = useCallback(async () => {
    try {
      const path = mode === "staff" ? `/staff/tickets/${ticketId}/history` : `/tickets/${ticketId}/history`;
      const data = await apiGet<HistoryEntry[]>(path);
      setEntries([...data].reverse());
      setState("loaded");
    } catch {
      setState("error");
    }
  }, [mode, ticketId]);

  useEffect(() => { load(); }, [load, refreshKey]);

  return (
    <details className="card p-4 mb-3" open>
      <summary className="h5 mb-0" style={{ cursor: "pointer" }}>Status History</summary>
      <div className="mt-3">
        {state === "loading" && <p className="mb-0" aria-busy="true">Loading history…</p>}
        {state === "error" && (
          <p className="text-danger mb-0">
            Unable to load the status history. <button className="btn btn-link p-0 align-baseline" onClick={load}>Retry</button>
          </p>
        )}
        {state === "loaded" && entries.length === 0 && (
          <p className="text-muted mb-0">No status changes recorded since this feature was introduced.</p>
        )}
        {state === "loaded" && entries.length > 0 && (
          <ol className="list-unstyled mb-0" data-testid="status-history">
            {entries.map((h) => (
              <li key={h.id} className="py-1 border-bottom">
                <span className="fw-semibold">
                  {TICKET_STATUS_LABELS[h.fromStatus] ?? h.fromStatus} → {TICKET_STATUS_LABELS[h.toStatus] ?? h.toStatus}
                </span>
                <span className="text-muted small"> · {h.changedBy.name} · {formatDateTime(h.changedAt)}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </details>
  );
}
