import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { apiGet, apiPatch, apiPost, ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import AppShell from "../components/shell/AppShell";
import ActionsTaken from "../components/ActionsTaken";
import StatusBadge from "../components/StatusBadge";
import StatusHistory from "../components/StatusHistory";
import { allowedTransitions } from "../utils/workflow";
import { TICKET_STATUS_LABELS } from "../utils/format";

type StaffUser = { id: number; name: string };
type Note = { id: number; content: string; createdAt: string; author: { name: string } };
type Comment = { id: number; content: string; createdAt: string; author: { name: string; role: string } };
type StaffTicketData = {
  id: number; ticketNumber: string; summary: string; description: string;
  category: { name: string }; relatedSystem: { name: string };
  requester: { id: number; name: string };
  requestedPriority: string; itPriority: string; currentStatus: string;
  ticketOwner: { id: number; name: string } | null;
  problemAppearsResolved: boolean;
  version: number;
  resolutionGate?: { ok: boolean; reasons: string[] };
};

const label = (status: string) => TICKET_STATUS_LABELS[status] ?? status;

const readOnlyStyle = { backgroundColor: "#F0EFE8" };
const priorityBadgeClass = (p: string) =>
  p === "HIGH" ? "bg-danger" : p === "MEDIUM" ? "bg-warning text-dark" : "bg-success";

export default function StaffTicketDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [ticket, setTicket] = useState<StaffTicketData | null>(null);
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newNote, setNewNote] = useState("");
  const [newComment, setNewComment] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  // Ticket workflow (docs/lab-04/ui-spec.md Section 8)
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [statusReasons, setStatusReasons] = useState<string[]>([]);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [statusNotice, setStatusNotice] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!id) return;
    try {
      const [ticketData, notesData, commentsData, usersData] = await Promise.all([
        apiGet<StaffTicketData>(`/staff/tickets/${id}`),
        apiGet<Note[]>(`/staff/tickets/${id}/notes`),
        apiGet<Comment[]>(`/tickets/${id}/comments`),
        apiGet<StaffUser[]>(`/staff/users`),
      ]);
      setTicket(ticketData);
      setNotes(notesData);
      setComments(commentsData);
      setStaffUsers(usersData);
      setStatus("loaded");
    } catch {
      setStatus("error");
    }
  }, [id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (!statusNotice) return;
    const timer = setTimeout(() => setStatusNotice(""), 4000);
    return () => clearTimeout(timer);
  }, [statusNotice]);

  if (status === "loading") return <AppShell><p>⏳ loading...</p></AppShell>;
  if (status === "error" || !ticket) return <AppShell><p className="text-danger">Unable to load this ticket.</p></AppShell>;

  const allowedNextStatuses = allowedTransitions(ticket.currentStatus, user?.role ?? "");
  const gateReasons = ticket.resolutionGate && !ticket.resolutionGate.ok ? ticket.resolutionGate.reasons : [];

  // Run a mutation, surface the server's message on failure, then re-sync everything from the server.
  const runAction = async (action: () => Promise<unknown>) => {
    setActionError(null);
    try {
      await action();
    } catch (err: any) {
      setActionError(err?.message || "Something went wrong");
    }
    await fetchAll();
  };

  const handleOwnerChange = (ownerId: number | null) =>
    runAction(() => apiPatch(`/staff/tickets/${ticket.id}/owner`, { ownerId }));

  const handleClaimForMe = () => handleOwnerChange(user!.id);

  const handlePriorityChange = (itPriority: string) =>
    runAction(() => apiPatch(`/staff/tickets/${ticket.id}/priority`, { itPriority }));

  // Choosing a status only stages it; the inline confirm row saves it.
  const handleStatusSelect = (newStatus: string) => {
    setStatusError(null);
    setStatusReasons([]);
    setPendingStatus(newStatus === ticket.currentStatus ? null : newStatus);
  };

  const confirmStatusChange = async () => {
    if (!pendingStatus || savingStatus) return;
    setSavingStatus(true);
    setStatusError(null);
    setStatusReasons([]);
    try {
      await apiPatch(`/staff/tickets/${ticket.id}/status`, { status: pendingStatus, expectedVersion: ticket.version });
      setStatusNotice(`Status changed to ${label(pendingStatus)}`);
      setPendingStatus(null);
      await fetchAll();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setConflict(true);
        setPendingStatus(null);
      } else if (err instanceof ApiError && err.code === "RESOLUTION_GATE") {
        setStatusError(err.message);
        setStatusReasons(err.body.reasons ?? []);
      } else {
        setStatusError(err instanceof ApiError ? err.message : "Unable to reach TokTickIT. Please try again.");
      }
    } finally {
      setSavingStatus(false);
    }
  };

  const reloadAfterConflict = async () => {
    setConflict(false);
    await fetchAll();
  };

  const handlePostNote = async () => {
    if (!newNote.trim()) return;
    await runAction(() => apiPost(`/staff/tickets/${ticket.id}/notes`, { content: newNote }));
    setNewNote("");
  };

  const handlePostComment = async () => {
    if (!newComment.trim()) return;
    await runAction(() => apiPost(`/tickets/${ticket.id}/comments`, { content: newComment }));
    setNewComment("");
  };

  return (
    <AppShell>
      {actionError && <div className="alert alert-danger" role="alert">{actionError}</div>}
      {conflict && (
        <div className="alert alert-warning d-flex justify-content-between align-items-center flex-wrap gap-2" role="alert">
          <span>This ticket was changed by someone else.</span>
          <button className="btn btn-sm btn-outline-dark" onClick={reloadAfterConflict}>Reload</button>
        </div>
      )}
      <div role="status" aria-live="polite">
        {statusNotice && <div className="alert alert-success py-2">{statusNotice}</div>}
      </div>

      <div className="card p-4 mb-3">
        <div className="d-flex align-items-center gap-2 flex-wrap mb-2">
          <h2 className="mb-0">{ticket.ticketNumber}</h2>
          <StatusBadge status={ticket.currentStatus} testId="ticket-status-badge" />
        </div>
        <div className="row">
          <div className="col-md-4">
            <label className="text-muted">Requester</label>
            <p className="form-control" style={readOnlyStyle}>{ticket.requester.name}</p>
          </div>
          <div className="col-md-4">
            <label className="text-muted">Category</label>
            <p className="form-control" style={readOnlyStyle}>{ticket.category.name}</p>
          </div>
          <div className="col-md-4">
            <label className="text-muted">Requested Priority</label>
            <div><span className={`badge ${priorityBadgeClass(ticket.requestedPriority)}`}>{ticket.requestedPriority}</span></div>
          </div>
        </div>

        <div className="row mt-3">
          <div className="col-md-4">
            <label htmlFor="owner-select">Ticket Owner</label>
            <select id="owner-select" className="form-select" value={ticket.ticketOwner?.id ?? ""} data-testid="owner-select"
              onChange={(e) => handleOwnerChange(e.target.value ? Number(e.target.value) : null)}>
              <option value="">Unassigned</option>
              {staffUsers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <button className="btn btn-sm btn-outline-primary mt-1" onClick={handleClaimForMe}>Claim for me</button>
          </div>
          <div className="col-md-4">
            <label htmlFor="it-priority-select">IT Priority</label>
            <select id="it-priority-select" className="form-select" data-testid="it-priority-select" value={ticket.itPriority}
              onChange={(e) => handlePriorityChange(e.target.value)}>
              <option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option>
            </select>
          </div>
          <div className="col-md-4">
            <label htmlFor="status-select">Status</label>
            <select id="status-select" className="form-select" data-testid="status-select"
              value={pendingStatus ?? ticket.currentStatus} disabled={savingStatus || allowedNextStatuses.length === 0}
              aria-describedby={gateReasons.length > 0 || statusError ? "status-help" : undefined}
              onChange={(e) => handleStatusSelect(e.target.value)}>
              <option value={ticket.currentStatus}>{label(ticket.currentStatus)} (current)</option>
              {allowedNextStatuses.map((s) => <option key={s} value={s}>{label(s)}</option>)}
            </select>
            {pendingStatus && (
              <div className="d-flex align-items-center gap-2 flex-wrap mt-2" data-testid="status-confirm">
                <span className="small">Change status to {label(pendingStatus)}?</span>
                <button className="btn btn-sm btn-primary" onClick={confirmStatusChange} disabled={savingStatus}>
                  {savingStatus ? "Saving…" : "Confirm"}
                </button>
                <button className="btn btn-sm btn-outline-secondary" onClick={() => handleStatusSelect(ticket.currentStatus)} disabled={savingStatus}>
                  Cancel
                </button>
              </div>
            )}
            <div id="status-help">
              {statusError && (
                <div className="text-danger small mt-2" role="alert">
                  {statusError}
                  {statusReasons.length > 0 && <ul className="mb-0 ps-3">{statusReasons.map((r) => <li key={r}>{r}</li>)}</ul>}
                </div>
              )}
              {!statusError && allowedNextStatuses.includes("RESOLVED") && gateReasons.length > 0 && (
                <div className="form-text" data-testid="gate-hint">
                  To resolve this ticket:
                  <ul className="mb-0 ps-3">{gateReasons.map((r) => <li key={r}>{r}</li>)}</ul>
                </div>
              )}
            </div>
          </div>
        </div>

        {ticket.problemAppearsResolved && (
          <div className="alert alert-success mt-3">Requester has indicated the problem appears resolved.</div>
        )}

        <div className="mt-3">
          <label className="text-muted">Summary</label>
          <p className="form-control" style={readOnlyStyle}>{ticket.summary}</p>
        </div>
        <div className="mt-3">
          <label className="text-muted">Description</label>
          <p className="form-control" style={{ ...readOnlyStyle, whiteSpace: "pre-wrap" }}>{ticket.description}</p>
        </div>
      </div>

      <ActionsTaken ticketId={ticket.id} ticketStatus={ticket.currentStatus} mode="staff" staffUsers={staffUsers} onChanged={fetchAll} />

      <StatusHistory ticketId={ticket.id} mode="staff" refreshKey={ticket.version} />

      <div className="card p-4 mb-3">
        <h3>Public Comments</h3>
        {comments.map((c) => (
          <div key={c.id} className="mb-2 p-2" style={{ backgroundColor: "var(--color-pale-green)" }}>
            <strong>{c.author.name}</strong> <span className="badge bg-secondary">{c.author.role}</span>
            <p className="mb-0">{c.content}</p>
          </div>
        ))}
        <div className="d-flex gap-2 mt-2">
          <input className="form-control" aria-label="Public comment" value={newComment} onChange={(e) => setNewComment(e.target.value)} />
          <button className="btn btn-primary" onClick={handlePostComment}>Post</button>
        </div>
      </div>

      <div className="p-4" style={{ backgroundColor: "#FFF4E0", border: "1px solid var(--color-warning)" }}>
        <strong>🔒 Internal Notes — Staff only, not visible to the Requester</strong>
        <div className="mt-2">
          {notes.map((n) => (
            <div key={n.id} className="mb-2">
              <strong>{n.author.name}:</strong> {n.content}
            </div>
          ))}
        </div>
        <div className="d-flex gap-2 mt-2">
          <input className="form-control" aria-label="Internal note" value={newNote} onChange={(e) => setNewNote(e.target.value)} data-testid="note-input" />
          <button className="btn btn-sm btn-warning" onClick={handlePostNote}>Add Note</button>
        </div>
      </div>
    </AppShell>
  );
}
