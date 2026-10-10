import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiGet, apiPatch, ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import AppShell from "../components/shell/s";
import ActionsTaken from "../components/ActionsTaken";
import StatusBadge from "../components/StatusBadge";
import StatusHistory from "../components/StatusHistory";

type Attachment = {
  id: number; fileName: string; fileType: string; fileSize: number;
  isRemoved: boolean; removedReason: string | null; createdAt: string;
};
type Comment = {
  id: number;
  content: string;
  createdAt: string;
  author: { name: string; role: string };
};

type TicketDetailData = {
  id: number; ticketNumber: string; summary: string; description: string;
  category: { name: string }; relatedSystem: { name: string };
  requestedPriority: string; currentStatus: string; problemAppearsResolved: boolean;
  createdAt: string; requesterId: number; attachments: Attachment[]; version: number;
};
type Status = "loading" | "loaded" | "error" | "forbidden" | "not-found";

export default function TicketDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [ticket, setTicket] = useState<TicketDetailData | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [status, setStatus] = useState<Status>("loading");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [removeReason, setRemoveReason] = useState("");
  // Lab 4: Requester reopen (BR-13)
  const [confirmingReopen, setConfirmingReopen] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [reopenError, setReopenError] = useState<string | null>(null);

  const fetchTicket = useCallback(async () => {
    if (!user || !id) return;
    setStatus("loading");
    try {
      const data = await apiGet<TicketDetailData>(`/tickets/${id}`);
      setTicket(data);
      setStatus("loaded");
    } catch (err: any) {
      if (err.status === 403) setStatus("forbidden");
      else if (err.status === 404) setStatus("not-found");
      else setStatus("error");
    }
  }, [user, id]);

  const fetchComments = useCallback(async () => {
    if (!ticket) return;
    const data = await apiGet<Comment[]>(`/tickets/${ticket.id}/comments`);
    setComments(data);
  }, [ticket]);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    fetchTicket();
  }, [user, fetchTicket, navigate]);

  useEffect(() => {
    if (ticket) {
      fetchComments().catch(() => setComments([]));
    }
  }, [ticket, fetchComments]);

  if (!user) return null;

  const handlePostComment = async () => {
    if (!newComment.trim() || !ticket) return;
    await fetch(`/api/tickets/${ticket.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ content: newComment.trim() }),
    });
    setNewComment("");
    await fetchComments();
  };

  const handleReopen = async () => {
    if (!ticket || reopening) return;
    setReopening(true);
    setReopenError(null);
    try {
      await apiPatch(`/tickets/${ticket.id}/reopen`, { expectedVersion: ticket.version });
      setConfirmingReopen(false);
      await fetchTicket();
    } catch (err) {
      setConfirmingReopen(false);
      if (err instanceof ApiError && err.status === 409) {
        setReopenError("This ticket was changed by IT a moment ago. The latest version is now shown — please check it and try again.");
        await fetchTicket();
      } else {
        setReopenError(err instanceof ApiError ? err.message : "Unable to reach TokTickIT. Please try again.");
      }
    } finally {
      setReopening(false);
    }
  };

  const handleMarkResolved = async () => {
    if (!ticket) return;
    await fetch(`/api/tickets/${ticket.id}/mark-resolved`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({}),
    });
    await fetchTicket();
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !ticket) return;
    setUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`/api/tickets/${ticket.id}/attachments`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json();
        setUploadError(body.error || "Unable to upload attachment");
      } else {
        await fetchTicket();
      }
    } catch {
      setUploadError("Unable to connect to TokTickIT API");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleRemove = async (attachmentId: number) => {
    if (!removeReason.trim()) return;
    try {
      const res = await fetch(`/api/attachments/${attachmentId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason: removeReason }),
      });
      if (res.ok) {
        setRemovingId(null);
        setRemoveReason("");
        await fetchTicket();
      }
    } catch {
      // ปล่อยให้ผู้ใช้ลองใหม่
    }
  };

  const priorityBadgeClass = (p: string) =>
    p === "HIGH" ? "bg-danger" : p === "MEDIUM" ? "bg-warning text-dark" : "bg-success";

  return (
    <AppShell>
      {status === "loading" && <p>⏳ loading...</p>}
      {status === "error" && <p className="text-danger">Unable to load this ticket.</p>}
      {status === "forbidden" && <p className="text-danger">You do not have access to this ticket.</p>}
      {status === "not-found" && <p className="text-danger">Ticket not found.</p>}

      {status === "loaded" && ticket && (
        <>
          <div className="card p-4 mb-3">
            <h2>{ticket.ticketNumber}</h2>
            <div className="row">
              <div className="col-md-4">
                <label className="text-muted">Category</label>
                <p className="form-control" style={{ backgroundColor: "#F0EFE8" }}>{ticket.category.name}</p>
              </div>
              <div className="col-md-4">
                <label className="text-muted">Related System</label>
                <p className="form-control" style={{ backgroundColor: "#F0EFE8" }}>{ticket.relatedSystem.name}</p>
              </div>
              <div className="col-md-4">
                <label className="text-muted">Status</label>
                <div><StatusBadge status={ticket.currentStatus} testId="ticket-status-badge" /></div>
              </div>
            </div>
            <div className="mt-3">
              <label className="text-muted">Requested Priority</label>
              <div><span className={`badge ${priorityBadgeClass(ticket.requestedPriority)}`}>{ticket.requestedPriority}</span></div>
            </div>
            <div className="mt-3">
              <label className="text-muted">Summary</label>
              <p className="form-control" style={{ backgroundColor: "#F0EFE8" }}>{ticket.summary}</p>
            </div>
            <div className="mt-3">
              <label className="text-muted">Description</label>
              <p className="form-control" style={{ backgroundColor: "#F0EFE8", whiteSpace: "pre-wrap" }}>{ticket.description}</p>
            </div>
          </div>

          {(ticket.currentStatus === "RESOLVED" || ticket.currentStatus === "CLOSED") && (
            <div className="card p-3 mb-3 d-flex flex-row flex-wrap align-items-center gap-2">
              <span className="me-auto">Is the problem back? You can reopen this ticket so IT takes another look.</span>
              {confirmingReopen ? (
                <>
                  <span className="small">Reopen this ticket?</span>
                  <button className="btn btn-sm btn-primary" onClick={handleReopen} disabled={reopening}>
                    {reopening ? "Reopening…" : "Yes, reopen"}
                  </button>
                  <button className="btn btn-sm btn-outline-secondary" onClick={() => setConfirmingReopen(false)} disabled={reopening}>
                    Cancel
                  </button>
                </>
              ) : (
                <button className="btn btn-outline-primary" onClick={() => setConfirmingReopen(true)}>Reopen Ticket</button>
              )}
            </div>
          )}
          {reopenError && <div className="alert alert-danger" role="alert">{reopenError}</div>}

          <ActionsTaken ticketId={ticket.id} ticketStatus={ticket.currentStatus} mode="requester" />

          <StatusHistory ticketId={ticket.id} mode="requester" refreshKey={ticket.version} />

          <div className="card p-4">
            <h3>Attachments</h3>

            <input type="file" className="form-control mb-2" onChange={handleUpload} disabled={uploading} />
            {uploading && <p>⏳ Uploading...</p>}
            {uploadError && <div className="alert alert-danger">{uploadError}</div>}

            <ul className="list-group">
              {ticket.attachments.map((a) => (
                <li key={a.id} className="list-group-item d-flex justify-content-between align-items-center">
                  <div>
                    {a.fileName} <span className="text-muted small">({Math.round(a.fileSize / 1024)} KB)</span>
                    {a.isRemoved && (
                      <div className="text-muted small">
                        <span className="badge bg-secondary me-1">Removed</span>
                        Reason: {a.removedReason}
                      </div>
                    )}
                  </div>
                  <div className="d-flex gap-2">
                    {!a.isRemoved && (
                      <>
                        <a href={`/api/attachments/${a.id}/download`} className="btn btn-sm btn-outline-primary">
                          Download
                        </a>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => setRemovingId(a.id)}>
                          Remove
                        </button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            {removingId !== null && (
              <div className="mt-3 p-3" style={{ backgroundColor: "#F0EFE8" }}>
                <label>Reason for removal *</label>
                <input
                  className="form-control"
                  value={removeReason}
                  onChange={(e) => setRemoveReason(e.target.value)}
                />
                <button
                  className="btn btn-danger btn-sm mt-2"
                  disabled={!removeReason.trim()}
                  onClick={() => handleRemove(removingId)}
                >
                  Confirm Remove
                </button>
                <button
                  className="btn btn-outline-secondary btn-sm mt-2 ms-2"
                  onClick={() => { setRemovingId(null); setRemoveReason(""); }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          <div className="card p-4 mt-3">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
              <h3 className="mb-0">Public Comments</h3>
              {ticket.problemAppearsResolved ? (
                <span className="badge bg-success">Problem appears resolved</span>
              ) : (
                <button className="btn btn-outline-secondary btn-sm" onClick={handleMarkResolved}
                  title="Lets IT know it looks fixed. IT reviews the work and formally resolves the ticket.">
                  Mark problem as resolved
                </button>
              )}
            </div>

            <div className="mt-3">
              {comments.length === 0 && <p className="text-muted mb-0">No comments yet.</p>}
              {comments.map((comment) => (
                <div key={comment.id} className="mb-2 p-2" style={{ backgroundColor: "var(--color-pale-green, #edf7ed)" }}>
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <strong>{comment.author.name}</strong>
                    <span className="badge bg-secondary">{comment.author.role}</span>
                  </div>
                  <p className="mb-0">{comment.content}</p>
                </div>
              ))}
            </div>

            <div className="d-flex gap-2 mt-3">
              <input
                className="form-control"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
              />
              <button className="btn btn-primary" onClick={handlePostComment} disabled={!newComment.trim()}>
                Post
              </button>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}