import { Link } from "react-router-dom";

// Dashboard metric card (docs/lab-04/ui-spec.md Sections 4–5): label + value, the whole card is one link
// with an accessible name such as "Open Tickets: 3. View tickets".
type Props = {
  label: string;
  value: number;
  to: string;
  actionText?: string;
  /** Amber accent when the value needs attention (e.g. Waiting for Me > 0). */
  attention?: boolean;
  testId?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
};

export default function MetricCard({ label, value, to, actionText = "View tickets", attention = false, testId, onClick }: Props) {
  return (
    <Link to={to} onClick={onClick} data-testid={testId}
      className="card h-100 p-3 text-decoration-none metric-card"
      style={{ borderLeft: `4px solid ${attention && value > 0 ? "var(--color-warning)" : "var(--color-secondary)"}`, color: "var(--color-text)" }}
      aria-label={`${label}: ${value}. ${actionText}`}>
      <span className="text-muted small">{label}</span>
      <span className="fs-2 fw-bold" style={{ color: "var(--color-primary)" }}>{value}</span>
      <span className="small" style={{ color: "var(--color-secondary)" }}>{actionText} <span aria-hidden="true">→</span></span>
    </Link>
  );
}
