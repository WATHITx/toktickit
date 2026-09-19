import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { apiGet, apiPatch, apiPost } from "../api/client";
import { useAuth } from "../context/AuthContext";
import AppShell from "../components/shell/AppShell";

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
};

// Mirrors server/src/validation/statusTransitions.ts — the server remains the source of truth (BR-13).
const STATUS_TRANSITIONS: Record<string, string[]> = {
  NEW: ["OPEN", "IN_PROGRESS", "CANCELLED"],
  OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "CANCELLED"],
  IN_PROGRESS: ["OPEN", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  WAITING_FOR_REQUESTER: ["OPEN", "IN_PROGRESS", "CANCELLED"],
  RESOLVED: ["IN_PROGRESS", "CLOSED", "REOPENED"],
  CLOSED: ["REOPENED"],
  REOPENED: ["OPEN", "IN_PROGRESS", "CANCELLED"],
  CANCELLED: [],
};

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

  if (status === "loading") return <AppShell><p>⏳ loading...</p></AppShell>;
  if (status === "error" || !ticket) return <AppShell><p className="text-danger">Unable to load this ticket.</p></AppShell>;

  const allowedNextStatuses = STATUS_TRANSITIONS[ticket.currentStatus] || [];

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

  const handleStatusChange = (newStatus: string) => {
    if (newStatus === ticket.currentStatus) return;
    return runAction(() => apiPatch(`/staff/tickets/${ticket.id}/status`, { status: newStatus }));
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

      <div className="card p-4 mb-3">
        <h2>{ticket.ticketNumber}</h2>
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
            <select id="status-select" className="form-select" data-testid="status-select" value={ticket.currentStatus}
              onChange={(e) => handleStatusChange(e.target.value)}>
              <option value={ticket.currentStatus}>{ticket.currentStatus}</option>
              {allowedNextStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
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
