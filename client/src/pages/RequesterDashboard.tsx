import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiGet } from "../api/client";
import { useAuth } from "../context/AuthContext";
import MetricCard from "../components/MetricCard";
import StatusBadge from "../components/StatusBadge";
import { formatDateTime, relativeTime } from "../utils/format";

// Requester Dashboard (docs/lab-04/ui-spec.md Section 4). Numbers come from GET /api/dashboard/requester.

type TicketRow = { id: number; ticketNumber: string; summary: string; currentStatus: string; updatedAt: string };
type RequesterDashboardData = {
  metrics: { openTickets: number; waitingForMe: number; recentlyResolved: number };
  recentlyUpdated: TicketRow[];
};

export default function RequesterDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<RequesterDashboardData | null>(null);
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading");

  const load = useCallback(async () => {
    setState("loading");
    try {
      setData(await apiGet<RequesterDashboardData>("/dashboard/requester"));
      setState("loaded");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const firstName = user?.name.split(" ")[0] ?? "";

  return (
    <>
      <div className="mb-3">
        <h2 className="mb-0">Dashboard</h2>
        <p className="text-muted mb-0">Welcome back, {firstName}. Here is what is happening with your tickets.</p>
      </div>

      {state === "loading" && (
        <div className="row g-3" aria-busy="true" aria-label="Loading dashboard">
          {[0, 1, 2].map((i) => <div key={i} className="col-12 col-md-4"><div className="card p-3 placeholder-glow" style={{ height: 110 }}><span className="placeholder col-6" /></div></div>)}
        </div>
      )}

      {state === "error" && (
        <div className="alert alert-danger d-flex justify-content-between align-items-center flex-wrap gap-2" role="alert">
          <span>Unable to reach TokTickIT. Please try again.</span>
          <button className="btn btn-sm btn-outline-dark" onClick={load}>Retry</button>
        </div>
      )}

      {state === "loaded" && data && (
        <>
          <div className="row g-3 mb-3">
            <div className="col-12 col-md-4">
              <MetricCard label="Open Tickets" value={data.metrics.openTickets} to="/my-tickets?status=ACTIVE" testId="metric-open" />
            </div>
            <div className="col-12 col-md-4">
              <MetricCard label="Waiting for Me" value={data.metrics.waitingForMe} to="/my-tickets?status=WAITING_FOR_REQUESTER"
                attention testId="metric-waiting" />
            </div>
            <div className="col-12 col-md-4">
              <MetricCard label="Recently Resolved" value={data.metrics.recentlyResolved} to="/my-tickets?status=RECENTLY_RESOLVED"
                testId="metric-resolved" />
            </div>
          </div>

          <section className="card p-4" aria-labelledby="recently-updated-heading">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
              <h3 id="recently-updated-heading" className="h5 mb-0">Recently Updated</h3>
              <Link to="/my-tickets">View all my tickets</Link>
            </div>
            {data.recentlyUpdated.length === 0 ? (
              <p className="text-muted mb-0">
                No ticket activity yet. <Link to="/create-ticket">Create a ticket</Link> to get help from IT.
              </p>
            ) : (
              <ul className="list-unstyled mb-0" data-testid="recently-updated">
                {data.recentlyUpdated.map((t) => (
                  <li key={t.id} className="border-bottom py-2">
                    <Link to={`/tickets/${t.id}`} className="d-flex flex-wrap align-items-center gap-2 text-decoration-none" style={{ color: "var(--color-text)" }}>
                      <span className="fw-semibold">{t.ticketNumber}</span>
                      <span className="flex-grow-1 text-break">{t.summary}</span>
                      <StatusBadge status={t.currentStatus} />
                      <span className="text-muted small" title={formatDateTime(t.updatedAt)}>{relativeTime(t.updatedAt)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </>
  );
}
