import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { apiGet } from "../api/client";
import { useAuth } from "../context/AuthContext";
import MetricCard from "../components/MetricCard";
import StatusBadge from "../components/StatusBadge";
import { TICKET_STATUS_LABELS, formatDateTime, relativeTime } from "../utils/format";

// IT Staff / Administrator Dashboard (docs/lab-04/ui-spec.md Section 5). Numbers come from GET /api/dashboard/staff.

type TicketRow = { id: number; ticketNumber: string; summary: string; currentStatus: string; updatedAt: string };
type UrgentRow = { id: number; ticketNumber: string; summary: string; currentStatus: string; createdAt: string; ticketOwner: { id: number; name: string } | null };
type ActionRow = { id: number; ticketId: number; ticketNumber: string; description: string; actionAt: string };
type StaffDashboardData = {
  metrics: { unassigned: number; assignedToMe: number; myOpenActions: number };
  byStatus: Record<string, number>;
  byItPriority: Record<string, number>;
  urgent: UrgentRow[];
  recentlyUpdated: TicketRow[];
  myOpenActionsList: ActionRow[];
  userCounts?: Record<string, { active: number; inactive: number }>;
};

const STATUS_ORDER = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED"];
const PRIORITY_ORDER: [string, string][] = [["HIGH", "High"], ["MEDIUM", "Medium"], ["LOW", "Low"]];
const ROLE_LABELS: [string, string][] = [["REQUESTER", "Requesters"], ["IT_STAFF", "IT Staff"], ["ADMINISTRATOR", "Administrators"]];
const rowLinkStyle = { color: "var(--color-text)" };

function ListCard({ id, title, empty, children, count, headingRef }: {
  id: string; title: string; empty: string; count: number; children: React.ReactNode; headingRef?: React.RefObject<HTMLHeadingElement>;
}) {
  return (
    <section className="card p-4 h-100" aria-labelledby={`${id}-heading`} id={id}>
      <h3 id={`${id}-heading`} ref={headingRef} tabIndex={-1} className="h5">{title}</h3>
      {count === 0 ? <p className="text-muted mb-0">{empty}</p> : <ul className="list-unstyled mb-0" data-testid={id}>{children}</ul>}
    </section>
  );
}

export default function StaffDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<StaffDashboardData | null>(null);
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading");
  const myActionsHeading = useRef<HTMLHeadingElement>(null);

  const load = useCallback(async () => {
    setState("loading");
    try {
      setData(await apiGet<StaffDashboardData>("/dashboard/staff"));
      setState("loaded");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // The "My Open Actions" card jumps to its list on this page instead of leaving the dashboard
  const focusMyActions = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    myActionsHeading.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    myActionsHeading.current?.focus();
  };

  return (
    <>
      <div className="mb-3">
        <h2 className="mb-0">Dashboard</h2>
        <p className="text-muted mb-0">Your starting point for the service desk, {user?.name.split(" ")[0]}.</p>
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
              <MetricCard label="Unassigned" value={data.metrics.unassigned} to="/my-queue?status=ACTIVE&ownership=unassigned"
                attention testId="metric-unassigned" />
            </div>
            <div className="col-12 col-md-4">
              <MetricCard label="Assigned to Me" value={data.metrics.assignedToMe} to="/my-queue?status=ACTIVE&ownership=mine" testId="metric-mine" />
            </div>
            <div className="col-12 col-md-4">
              <MetricCard label="My Open Actions" value={data.metrics.myOpenActions} to="#my-open-actions" actionText="View actions"
                onClick={focusMyActions} testId="metric-actions" />
            </div>
          </div>

          <div className="row g-3 mb-3">
            <div className="col-12 col-lg-7">
              <section className="card p-4 h-100" aria-labelledby="by-status-heading">
                <h3 id="by-status-heading" className="h5">Tickets by Status</h3>
                <ul className="list-unstyled mb-0 row row-cols-1 row-cols-sm-2 g-1" data-testid="by-status">
                  {STATUS_ORDER.map((s) => (
                    <li key={s} className="col">
                      <Link to={`/my-queue?status=${s}`} className="d-flex justify-content-between align-items-center border rounded px-2 py-1 text-decoration-none"
                        style={rowLinkStyle} aria-label={`${TICKET_STATUS_LABELS[s]}: ${data.byStatus[s] ?? 0} tickets`}>
                        <StatusBadge status={s} />
                        <span className="fw-semibold">{data.byStatus[s] ?? 0}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
            <div className="col-12 col-lg-5">
              <section className="card p-4 h-100" aria-labelledby="by-priority-heading">
                <h3 id="by-priority-heading" className="h5">Active Tickets by IT Priority</h3>
                <ul className="list-unstyled mb-0" data-testid="by-priority">
                  {PRIORITY_ORDER.map(([p, label]) => (
                    <li key={p} className="mb-1">
                      <Link to={`/my-queue?status=ACTIVE&itPriority=${p}`} className="d-flex justify-content-between align-items-center border rounded px-2 py-1 text-decoration-none"
                        style={rowLinkStyle} aria-label={`${label} priority: ${data.byItPriority[p] ?? 0} active tickets`}>
                        <span className={`badge ${p === "HIGH" ? "bg-danger" : p === "MEDIUM" ? "bg-warning text-dark" : "bg-success"}`}>{label}</span>
                        <span className="fw-semibold">{data.byItPriority[p] ?? 0}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </div>

          <div className="row g-3 mb-3">
            <div className="col-12 col-lg-6">
              <ListCard id="urgent" title="Urgent (High Priority, Oldest First)" empty="No urgent tickets." count={data.urgent.length}>
                {data.urgent.map((t) => (
                  <li key={t.id} className="border-bottom py-2">
                    <Link to={`/staff/tickets/${t.id}`} className="d-flex flex-wrap align-items-center gap-2 text-decoration-none" style={rowLinkStyle}>
                      <span className="fw-semibold">{t.ticketNumber}</span>
                      <span className="flex-grow-1 text-break">{t.summary}</span>
                      <StatusBadge status={t.currentStatus} />
                      <span className="small text-muted">{t.ticketOwner ? t.ticketOwner.name : "Unassigned"}</span>
                    </Link>
                  </li>
                ))}
              </ListCard>
            </div>
            <div className="col-12 col-lg-6">
              <ListCard id="my-open-actions" title="My Open Actions" empty="You have no open actions." count={data.myOpenActionsList.length}
                headingRef={myActionsHeading}>
                {data.myOpenActionsList.map((a) => (
                  <li key={a.id} className="border-bottom py-2">
                    <Link to={`/staff/tickets/${a.ticketId}`} className="d-flex flex-wrap align-items-center gap-2 text-decoration-none" style={rowLinkStyle}>
                      <span className="fw-semibold">{a.ticketNumber}</span>
                      <span className="flex-grow-1 text-break">{a.description}</span>
                      <span className="small text-muted">{formatDateTime(a.actionAt)}</span>
                    </Link>
                  </li>
                ))}
              </ListCard>
            </div>
          </div>

          <div className="row g-3">
            <div className={data.userCounts ? "col-12 col-lg-7" : "col-12"}>
              <ListCard id="staff-recently-updated" title="Recently Updated" empty="No recent activity." count={data.recentlyUpdated.length}>
                {data.recentlyUpdated.map((t) => (
                  <li key={t.id} className="border-bottom py-2">
                    <Link to={`/staff/tickets/${t.id}`} className="d-flex flex-wrap align-items-center gap-2 text-decoration-none" style={rowLinkStyle}>
                      <span className="fw-semibold">{t.ticketNumber}</span>
                      <span className="flex-grow-1 text-break">{t.summary}</span>
                      <StatusBadge status={t.currentStatus} />
                      <span className="small text-muted" title={formatDateTime(t.updatedAt)}>{relativeTime(t.updatedAt)}</span>
                    </Link>
                  </li>
                ))}
              </ListCard>
            </div>
            {data.userCounts && (
              <div className="col-12 col-lg-5">
                <section className="card p-4 h-100" aria-labelledby="users-heading">
                  <h3 id="users-heading" className="h5">Users</h3>
                  <ul className="list-unstyled mb-0" data-testid="user-counts">
                    {ROLE_LABELS.map(([role, label]) => (
                      <li key={role} className="mb-1">
                        <Link to={`/admin/users?role=${role}`} className="d-flex justify-content-between align-items-center border rounded px-2 py-1 text-decoration-none" style={rowLinkStyle}>
                          <span>{label}</span>
                          <span className="small">
                            <span className="fw-semibold">{data.userCounts![role].active}</span> active
                            {data.userCounts![role].inactive > 0 && <span className="text-muted"> · {data.userCounts![role].inactive} inactive</span>}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
