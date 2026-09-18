import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet } from "../api/client";
import AppShell from "../components/shell/AppShell";

type Ticket = {
  id: number; ticketNumber: string; summary: string;
  category: { name: string }; requestedPriority: string; itPriority: string;
  currentStatus: string; ticketOwner: { id: number; name: string } | null;
  requester: { name: string }; createdAt: string;
};
type Status = "loading" | "loaded" | "empty" | "no-results" | "error";

const PAGE_SIZE = 10;

export default function StaffTicketQueue() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [ownership, setOwnership] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState<Status>("loading");
  const [hasAnyEver, setHasAnyEver] = useState(false);

  const fetchQueue = useCallback(async () => {
    setStatus("loading");
    try {
      const params = new URLSearchParams({
        page: String(page), pageSize: String(PAGE_SIZE), sortBy, sortDir, ownership,
      });
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      if (priorityFilter) params.set("itPriority", priorityFilter);

      const result = await apiGet<{ data: Ticket[]; pagination: { totalPages: number } }>(`/staff/tickets?${params}`);
      setTickets(result.data);
      setTotalPages(result.pagination.totalPages);

      if (result.data.length > 0) {
        setHasAnyEver(true);
        setStatus("loaded");
      } else {
        const isFiltering = Boolean(search || statusFilter || priorityFilter || ownership !== "all");
        setStatus(hasAnyEver || isFiltering ? "no-results" : "empty");
      }
    } catch {
      setStatus("error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, statusFilter, priorityFilter, ownership, sortBy, sortDir]);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);
  useEffect(() => { setPage(1); }, [search, statusFilter, priorityFilter, ownership]);

  const clearFilters = () => {
    setSearch(""); setStatusFilter(""); setPriorityFilter(""); setOwnership("all");
  };

  const priorityBadgeClass = (p: string) =>
    p === "HIGH" ? "bg-danger" : p === "MEDIUM" ? "bg-warning text-dark" : "bg-success";

  return (
    <AppShell>
      <div className="d-flex justify-content-between align-items-center flex-wrap mb-3">
        <div>
          <h2 className="mb-0">My Queue</h2>
          <p className="text-muted">Find and prioritize IT support tickets.</p>
        </div>
        <button className="btn btn-outline-secondary" onClick={clearFilters}>Clear Filters</button>
      </div>

      <div className="row g-2 mb-3">
        <div className="col-md-4">
          <input className="form-control" placeholder="Search by ticket number or summary..."
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="col-md-2">
          <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="NEW">New</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="WAITING_FOR_REQUESTER">Waiting for Requester</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
        <div className="col-md-2">
          <select className="form-select" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
            <option value="">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </div>
        <div className="col-md-2">
          <select className="form-select" value={ownership} onChange={(e) => setOwnership(e.target.value)}>
            <option value="all">All Tickets</option>
            <option value="mine">Assigned to Me</option>
            <option value="unassigned">Unassigned</option>
          </select>
        </div>
      </div>

      {status === "loading" && <p>⏳ loading...</p>}
      {status === "error" && <p className="text-danger">Unable to load the queue.</p>}
      {status === "empty" && <p>No tickets in the queue yet.</p>}
      {status === "no-results" && <p>No tickets match your search or filters.</p>}

      {status === "loaded" && (
        <>
          <table className="table d-none d-md-table">
            <thead>
              <tr>
                <th>Ticket No.</th><th>Created</th><th>Summary</th><th>Requester</th>
                <th>Category</th><th>Req. Priority</th><th>IT Priority</th><th>Status</th><th>Owner</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id} data-testid="ticket-row" onClick={() => navigate(`/staff/tickets/${t.id}`)} style={{ cursor: "pointer" }}>
                  <td>{t.ticketNumber}</td>
                  <td>{new Date(t.createdAt).toLocaleDateString()}</td>
                  <td>{t.summary}</td>
                  <td>{t.requester.name}</td>
                  <td>{t.category.name}</td>
                  <td><span className={`badge ${priorityBadgeClass(t.requestedPriority)}`}>{t.requestedPriority}</span></td>
                  <td><span className={`badge ${priorityBadgeClass(t.itPriority)}`}>{t.itPriority}</span></td>
                  <td><span className="badge bg-info text-dark">{t.currentStatus}</span></td>
                  <td>{t.ticketOwner ? t.ticketOwner.name : <span className="text-muted">Unassigned</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="d-md-none">
            {tickets.map((t) => (
              <div key={t.id} data-testid="ticket-row" className="card mb-2 p-3"
                onClick={() => navigate(`/staff/tickets/${t.id}`)} style={{ cursor: "pointer" }}>
                <div className="d-flex justify-content-between">
                  <strong>{t.ticketNumber}</strong>
                  <span className={`badge ${priorityBadgeClass(t.itPriority)}`}>{t.itPriority}</span>
                </div>
                <div>{t.summary}</div>
                <div className="text-muted small">
                  {t.category.name} · <span className="badge bg-info text-dark">{t.currentStatus}</span> ·{" "}
                  {t.ticketOwner ? t.ticketOwner.name : "Unassigned"}
                </div>
              </div>
            ))}
          </div>

          <nav className="mt-3">
            <ul className="pagination">
              <li className={`page-item ${page <= 1 ? "disabled" : ""}`}>
                <button className="page-link" onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</button>
              </li>
              <li className="page-item disabled"><span className="page-link">Page {page} of {totalPages}</span></li>
              <li className={`page-item ${page >= totalPages ? "disabled" : ""}`}>
                <button className="page-link" onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
              </li>
            </ul>
          </nav>
        </>
      )}
    </AppShell>
  );
}