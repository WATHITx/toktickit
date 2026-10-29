import { Link } from "react-router-dom";

// Shared feedback states (docs/lab-04/ui-spec.md Section 3) so every screen looks and behaves the same.

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="d-flex align-items-center gap-2 text-muted py-3" role="status" aria-busy="true">
      <span className="spinner-border spinner-border-sm" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

function MessagePage({ title, message }: { title: string; message: string }) {
  return (
    <section className="card p-4 text-center mx-auto" style={{ maxWidth: 560 }} aria-labelledby="message-page-heading">
      <h2 id="message-page-heading" className="h4">{title}</h2>
      <p className="text-muted">{message}</p>
      <div><Link to="/dashboard" className="btn btn-primary">Go to Dashboard</Link></div>
    </section>
  );
}

/** Shown to a signed-in user who opens a screen their role cannot use (FR-20). */
export function ForbiddenMessage() {
  return (
    <MessagePage title="You don't have access to this page"
      message="Your account role doesn't include this screen. If you think this is a mistake, contact an Administrator." />
  );
}

/** Unknown routes and records that do not exist. */
export function NotFoundMessage({ what = "page" }: { what?: string }) {
  return <MessagePage title={`This ${what} could not be found`} message="It may have been moved, or the link may be wrong." />;
}
