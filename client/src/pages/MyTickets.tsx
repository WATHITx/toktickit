import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiGet } from "../api/client";
import { useAuth } from "../context/AuthContext";
import AppShell from "../components/shell/s";

type Ticket = {
  id: number; ticketNumber: string; summary: string;
  category: { name: string }; requestedPriority: string;
  currentStatus: string; createdAt: string;
};
type Category = { id: number; name: string };
type Status = "loading" | "loaded" | "empty" | "no-results" | "error";

const PAGE_SIZE = 10;

export default function MyTickets() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [priority, setPriority] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState<Status>("loading");
  const [hasAnyTicketsEver, setHasAnyTicketsEver] = useState(false);

  useEffect(() => {
    apiGet<Category[]>("/categories").then(setCategories).catch(() => {});
  }, []);

  const fetchTickets = useCallback(async () => {
    if (!user) return;
    setStatus("loading");
    try {
      const params = new URLSearchParams({
        requesterId: String(user.id),
        page: String(page),
        pageSize: String(PAGE_SIZE),
        sortBy, sortDir,
      });
      if (search) params.set("search", search);
      if (categoryId) params.set("categoryId", categoryId);
      if (priority) params.set("requestedPriority", priority);
      if (statusFilter) params.set("status", statusFilter);

      const result = await apiGet<{ data: Ticket[]; pagination: { totalPages: number } }>(`/tickets?${params}`);
      setTickets(result.data);
      setTotalPages(result.pagination.totalPages);

      if (result.data.length > 0) {
        setHasAnyTicketsEver(true);
        setStatus("loaded");
      } else {
        const isFiltering = Boolean(search || categoryId || priority || statusFilter);
        setStatus(hasAnyTicketsEver || isFiltering ? "no-results" : "empty");
      }
    } catch {
      setStatus("error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, page, search, categoryId, priority, statusFilter, sortBy, sortDir]);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    fetchTickets();
  }, [user, fetchTickets, navigate]);

  // รีเซ็ตกลับหน้า 1 ทุกครั้งที่เปลี่ยน filter/search
  useEffect(() => { setPage(1); }, [search, categoryId, priority, statusFilter]);

  const clearFilters = () => {
    setSearch(""); setCategoryId(""); setPriority(""); setStatusFilter("");
  };

  if (!user) return null;

  const priorityBadgeClass = (p: string) =>
    p === "HIGH" ? "bg-danger" : p === "MEDIUM" ? "bg-warning text-dark" : "bg-success";

  return (
    <AppShell>
      <div className="d-flex justify-content-between align-items-center flex-wrap mb-3">
        <div>
          <h2 className="mb-0">My Tickets</h2>
          <p className="text-muted">View and track all of your support requests.</p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary" onClick={clearFilters}>Clear Filters</button>
          <Link to="/create-ticket" className="btn btn-primary">+ Create Ticket</Link>
        </div>
      </div>

      <div className="row g-2 mb-3">
        <div className="col-md-4">
          <input
            className="form-control"
            placeholder="Search by ticket number or summary..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="col-md-3">
          <select className="form-select" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">All Categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="col-md-2">
          <select className="form-select" value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </div>
        <div className="col-md-3">
          <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="NEW">New</option>
          </select>
        </div>
      </div>

      {status === "loading" && <p>⏳ loading...</p>}
      {status === "error" && <p className="text-danger">Unable to load tickets.</p>}
      {status === "empty" && (
        <div className="alert alert-secondary">
          You haven't created any tickets yet. <Link to="/create-ticket">Create your first ticket</Link>.
        </div>
      )}
      {status === "no-results" && (
        <div className="alert alert-secondary">
          No tickets match your search or filters. <button className="btn btn-link p-0" onClick={clearFilters}>Clear filters</button>.
        </div>
      )}

      {status === "loaded" && (
        <>
          {/* Desktop: table */}
          <table className="table d-none d-md-table">
            <thead>
              <tr>
                <th style={{ cursor: "pointer" }} onClick={() => { setSortBy("ticketNumber"); setSortDir(sortDir === "asc" ? "desc" : "asc"); }}>
                  Ticket No. {sortBy === "ticketNumber" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
                <th style={{ cursor: "pointer" }} onClick={() => { setSortBy("createdAt"); setSortDir(sortDir === "asc" ? "desc" : "asc"); }}>
                  Created Date {sortBy === "createdAt" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
                <th>Summary</th>
                <th>Category</th>
                <th>Requested Priority</th>
                <th style={{ cursor: "pointer" }} onClick={() => { setSortBy("currentStatus"); setSortDir(sortDir === "asc" ? "desc" : "asc"); }}>
                  Status {sortBy === "currentStatus" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id} data-testid="ticket-row" onClick={() => navigate(`/tickets/${t.id}`)} style={{ cursor: "pointer" }}>
                  <td>{t.ticketNumber}</td>
                  <td>{new Date(t.createdAt).toLocaleDateString()}</td>
                  <td>{t.summary}</td>
                  <td>{t.category.name}</td>
                  <td><span className={`badge ${priorityBadgeClass(t.requestedPriority)}`}>{t.requestedPriority}</span></td>
                  <td><span className="badge bg-info text-dark">{t.currentStatus}</span></td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile: card list */}
          <div className="d-md-none">
            {tickets.map((t) => (
              <div key={t.id} data-testid="ticket-row" className="card mb-2 p-3" onClick={() => navigate(`/tickets/${t.id}`)} style={{ cursor: "pointer" }}>
                <div className="d-flex justify-content-between">
                  <strong>{t.ticketNumber}</strong>
                  <span className={`badge ${priorityBadgeClass(t.requestedPriority)}`}>{t.requestedPriority}</span>
                </div>
                <div>{t.summary}</div>
                <div className="text-muted small">{t.category.name} · <span className="badge bg-info text-dark">{t.currentStatus}</span></div>
              </div>
            ))}
          </div>

          {/* Pagination */}
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