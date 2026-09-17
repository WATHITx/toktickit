import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet, apiPost, ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import AppShell from "../components/shell/s";

type Category = { id: number; name: string };
type RelatedSystem = { id: number; name: string };
type FormState = {
  categoryId: string;
  relatedSystemId: string;
  summary: string;
  description: string;
  requestedPriority: string;
};
type Status = "idle" | "submitting" | "success" | "error";

const initialForm: FormState = {
  categoryId: "", relatedSystemId: "", summary: "", description: "", requestedPriority: "MEDIUM",
};

export default function CreateTicket() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [categories, setCategories] = useState<Category[]>([]);
  const [systems, setSystems] = useState<RelatedSystem[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>("idle");
  const [ticketNumber, setTicketNumber] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<Category[]>("/categories").then(setCategories).catch(() => {});
    apiGet<RelatedSystem[]>("/related-systems").then(setSystems).catch(() => {});
  }, []);

  if (!user) {
    navigate("/login");
    return null;
  }

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === "submitting") return; // BR-2A: กันการกดซ้ำ

    setStatus("submitting");
    setFieldErrors({});
    setServerError(null);

    try {
      const result = await apiPost<{ ticketNumber: string }>("/tickets", {
        requesterId: user.id,
        categoryId: Number(form.categoryId),
        relatedSystemId: Number(form.relatedSystemId),
        summary: form.summary,
        description: form.description,
        requestedPriority: form.requestedPriority,
      });
      setTicketNumber(result.ticketNumber);
      setStatus("success");
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setStatus("idle");
        setFieldErrors((err as any).errors || {});
      } else {
        setServerError("Unable to connect to TokTickIT API. Your entered values are preserved.");
        setStatus("error");
      }
    }
  };

  if (status === "success" && ticketNumber) {
    return (
      <AppShell>
        <div className="card p-4">
          <h2>Ticket Created</h2>
          <p>Your official Ticket Number: <strong>{ticketNumber}</strong></p>
          <button className="btn btn-primary" onClick={() => navigate("/my-tickets")}>
            View My Tickets
          </button>
          <button className="btn btn-outline-secondary ms-2" onClick={() => {
            setForm(initialForm); setStatus("idle"); setTicketNumber(null);
          }}>
            Create Another
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <form className="card p-4" onSubmit={handleSubmit}>
        <h2>Create Ticket</h2>

        {serverError && <div className="alert alert-danger">{serverError}</div>}

        <label htmlFor="category">Category *</label>
        <select id="category" className="form-select" value={form.categoryId}
          onChange={(e) => handleChange("categoryId", e.target.value)} required>
          <option value="">Select a category</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <label className="mt-3" htmlFor="relatedSystem">Related System *</label>
        <select id="relatedSystem" className="form-select" value={form.relatedSystemId}
          onChange={(e) => handleChange("relatedSystemId", e.target.value)} required>
          <option value="">Select a related system</option>
          {systems.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>

        <label className="mt-3" htmlFor="requestedPriority">Requested Priority *</label>
        <select id="requestedPriority" className="form-select" value={form.requestedPriority}
          onChange={(e) => handleChange("requestedPriority", e.target.value)}>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
        </select>

        <label className="mt-3" htmlFor="summary">Summary *</label>
        <input id="summary" className="form-control" value={form.summary} maxLength={150}
          onChange={(e) => handleChange("summary", e.target.value)} required />
        {fieldErrors.summary && <div className="text-danger">{fieldErrors.summary}</div>}

        <label className="mt-3" htmlFor="description">Description *</label>
        <textarea id="description" className="form-control" rows={5} maxLength={2000} value={form.description}
          onChange={(e) => handleChange("description", e.target.value)} required />
        {fieldErrors.description && <div className="text-danger">{fieldErrors.description}</div>}

        <button type="submit" className="btn btn-primary mt-4" disabled={status === "submitting"}>
          {status === "submitting" ? "Submitting…" : "Submit"}
        </button>
      </form>
    </AppShell>
  );
}