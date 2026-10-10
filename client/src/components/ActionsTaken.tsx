import { useCallback, useEffect, useRef, useState } from "react";
import { apiGet, apiPatch, apiPost, ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { ACTION_STATUS_LABELS, formatDateTime, fromDateTimeLocal, toDateTimeLocal } from "../utils/format";

// Lab 4 Actions Taken card (docs/lab-04/ui-spec.md Sections 6–7).
// "staff" mode lists, creates, edits, completes and cancels; "requester" mode is read-only.

export type ActionTaken = {
  id: number;
  ticketId: number;
  actionAt: string;
  description: string;
  result: string | null;
  followUpRequired: boolean;
  followUpNote: string | null;
  attachmentNotes: string | null;
  status: "PLANNED" | "COMPLETED" | "CANCELLED";
  performedBy: { id: number; name: string };
  assignee: { id: number; name: string };
  version: number;
};

type StaffUser = { id: number; name: string };
type FormValues = {
  actionAt: string;
  description: string;
  result: string;
  followUpRequired: boolean;
  followUpNote: string;
  attachmentNotes: string;
  assigneeId: number;
};
type FieldErrors = Record<string, string>;
type Banner = { kind: "error" | "conflict"; text: string } | null;

type Props = {
  ticketId: number;
  ticketStatus: string;
  mode: "staff" | "requester";
  staffUsers?: StaffUser[];
  onChanged?: () => void;
};

const LOCKED_TICKET_STATUSES = ["CLOSED", "CANCELLED"];
const NETWORK_ERROR = "Unable to reach TokTickIT. Please try again.";
const readOnlyStyle = { backgroundColor: "#F0EFE8" };

// `originalActionAt`: the value the form started with. An untouched date/time is not sent, so the server keeps
// its own value (create: now; edit: the stored time) instead of a copy truncated to the minute.
const toPayload = (v: FormValues, originalActionAt: string) => ({
  actionAt: v.actionAt === originalActionAt ? undefined : fromDateTimeLocal(v.actionAt),
  description: v.description,
  result: v.result,
  followUpRequired: v.followUpRequired,
  followUpNote: v.followUpRequired ? v.followUpNote : null,
  attachmentNotes: v.attachmentNotes,
  assigneeId: v.assigneeId,
});

const fromAction = (a: ActionTaken): FormValues => ({
  actionAt: toDateTimeLocal(a.actionAt),
  description: a.description,
  result: a.result ?? "",
  followUpRequired: a.followUpRequired,
  followUpNote: a.followUpNote ?? "",
  attachmentNotes: a.attachmentNotes ?? "",
  assigneeId: a.assignee.id,
});

export function ActionStatusBadge({ status }: { status: ActionTaken["status"] }) {
  const style =
    status === "COMPLETED" ? { backgroundColor: "var(--color-pale-green)", color: "var(--color-text)", border: "1px solid var(--color-secondary)" }
    : status === "PLANNED" ? { backgroundColor: "var(--color-surface)", color: "var(--color-secondary)", border: "1px solid var(--color-secondary)" }
    : { backgroundColor: "#E9ECEF", color: "#5C636A", border: "1px solid #CED4DA" };
  return <span className="badge" style={style}>{ACTION_STATUS_LABELS[status]}</span>;
}

function FollowUpBadge() {
  return (
    <span className="badge" style={{ backgroundColor: "#FFF4E0", color: "#7A5A00", border: "1px solid var(--color-warning)" }}>
      <span aria-hidden="true">⚑ </span>Follow-up
    </span>
  );
}

function ActionForm({ idPrefix, values, errors, staffUsers, performedByName, disabled, onChange, descriptionRef }: {
  idPrefix: string;
  values: FormValues;
  errors: FieldErrors;
  staffUsers: StaffUser[];
  performedByName: string;
  disabled: boolean;
  onChange: (v: FormValues) => void;
  descriptionRef?: React.RefObject<HTMLTextAreaElement>;
}) {
  const followUpRef = useRef<HTMLTextAreaElement>(null);
  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) => onChange({ ...values, [key]: value });
  const fieldId = (name: string) => `${idPrefix}-${name}`;
  const errorProps = (name: string) => errors[name]
    ? { "aria-invalid": true, "aria-describedby": fieldId(`${name}-error`), className: "form-control is-invalid" }
    : { className: "form-control" };
  const errorText = (name: string) => errors[name] && (
    <div id={fieldId(`${name}-error`)} className="invalid-feedback d-block">{errors[name]}</div>
  );

  return (
    <div className="row g-3">
      <div className="col-md-6">
        <label htmlFor={fieldId("actionAt")} className="form-label">Action Date/Time</label>
        <input id={fieldId("actionAt")} type="datetime-local" {...errorProps("actionAt")} value={values.actionAt}
          disabled={disabled} onChange={(e) => set("actionAt", e.target.value)} />
        {errorText("actionAt")}
      </div>
      <div className="col-md-6">
        <label htmlFor={fieldId("assigneeId")} className="form-label">Assignee</label>
        <select id={fieldId("assigneeId")} {...errorProps("assigneeId")} className={errors.assigneeId ? "form-select is-invalid" : "form-select"}
          value={values.assigneeId} disabled={disabled} onChange={(e) => set("assigneeId", Number(e.target.value))}>
          {staffUsers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        {errorText("assigneeId")}
      </div>

      <div className="col-12">
        <label htmlFor={fieldId("description")} className="form-label">Action Description *</label>
        <textarea id={fieldId("description")} ref={descriptionRef} rows={3} maxLength={2000} aria-required="true"
          {...errorProps("description")} value={values.description} disabled={disabled}
          onChange={(e) => set("description", e.target.value)} />
        <div className="form-text">{values.description.length}/2000</div>
        {errorText("description")}
      </div>

      <div className="col-12">
        <label htmlFor={fieldId("result")} className="form-label">Result</label>
        <textarea id={fieldId("result")} rows={2} maxLength={2000} {...errorProps("result")} value={values.result}
          disabled={disabled} onChange={(e) => set("result", e.target.value)} />
        <div className="form-text">Required when the action is marked Completed. {values.result.length}/2000</div>
        {errorText("result")}
      </div>

      <div className="col-12">
        <div className="form-check">
          <input id={fieldId("followUpRequired")} type="checkbox" className="form-check-input" checked={values.followUpRequired}
            disabled={disabled}
            onChange={(e) => {
              onChange({ ...values, followUpRequired: e.target.checked });
              if (e.target.checked) setTimeout(() => followUpRef.current?.focus(), 0);
            }} />
          <label htmlFor={fieldId("followUpRequired")} className="form-check-label">Follow-Up Required?</label>
        </div>
      </div>

      {values.followUpRequired && (
        <div className="col-12">
          <label htmlFor={fieldId("followUpNote")} className="form-label">Follow-up Note *</label>
          <textarea id={fieldId("followUpNote")} ref={followUpRef} rows={2} maxLength={1000} aria-required="true"
            {...errorProps("followUpNote")} value={values.followUpNote} disabled={disabled}
            onChange={(e) => set("followUpNote", e.target.value)} />
          {errorText("followUpNote")}
        </div>
      )}

      <div className="col-md-8">
        <label htmlFor={fieldId("attachmentNotes")} className="form-label">Attachment Notes</label>
        <input id={fieldId("attachmentNotes")} maxLength={500} {...errorProps("attachmentNotes")} value={values.attachmentNotes}
          placeholder="e.g. screenshot vpn-error.png in Attachments" disabled={disabled}
          onChange={(e) => set("attachmentNotes", e.target.value)} />
        {errorText("attachmentNotes")}
      </div>
      <div className="col-md-4">
        <span className="form-label d-block">Performed by</span>
        <p className="form-control mb-0" style={readOnlyStyle}>{performedByName}</p>
      </div>
    </div>
  );
}

function ReadOnlyDetails({ action }: { action: ActionTaken }) {
  const field = (label: string, value: string | null) => (
    <div className="col-12">
      <span className="text-muted small d-block">{label}</span>
      <p className="form-control mb-0" style={{ ...readOnlyStyle, whiteSpace: "pre-wrap", minHeight: "2.4rem" }}>{value || "—"}</p>
    </div>
  );
  return (
    <div className="row g-2">
      {field("Action Description", action.description)}
      {field("Result", action.result)}
      {action.followUpRequired && field("Follow-up Note", action.followUpNote)}
      {field("Attachment Notes", action.attachmentNotes)}
    </div>
  );
}

export default function ActionsTaken({ ticketId, ticketStatus, mode, staffUsers = [], onChanged }: Props) {
  const { user } = useAuth();
  const isStaff = mode === "staff";
  const canWrite = isStaff && !LOCKED_TICKET_STATUSES.includes(ticketStatus);

  const [actions, setActions] = useState<ActionTaken[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "loaded" | "error">("loading");
  const [banner, setBanner] = useState<Banner>(null);
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false); // blocks a second click before React re-renders the disabled button

  const [creating, setCreating] = useState(false);
  const [createValues, setCreateValues] = useState<FormValues | null>(null);
  const [createDefaultActionAt, setCreateDefaultActionAt] = useState("");
  const [createErrors, setCreateErrors] = useState<FieldErrors>({});

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<FormValues | null>(null);
  const [editErrors, setEditErrors] = useState<FieldErrors>({});
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const sectionRef = useRef<HTMLElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const createDescriptionRef = useRef<HTMLTextAreaElement>(null);
  const toggleRefs = useRef<Record<number, HTMLButtonElement | null>>({});

  const assigneeOptions = staffUsers.length > 0 ? staffUsers : user ? [{ id: user.id, name: user.name }] : [];

  const fetchActions = useCallback(async () => {
    try {
      const path = isStaff ? `/staff/tickets/${ticketId}/actions` : `/tickets/${ticketId}/actions`;
      setActions(await apiGet<ActionTaken[]>(path));
      setLoadState("loaded");
    } catch {
      setLoadState("error");
    }
  }, [isStaff, ticketId]);

  useEffect(() => { fetchActions(); }, [fetchActions]);

  useEffect(() => {
    if (creating) createDescriptionRef.current?.focus();
  }, [creating]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  // Maps an API failure onto field errors or a banner; the form keeps whatever the user typed.
  const showError = (err: unknown, setErrors: (e: FieldErrors) => void) => {
    if (err instanceof ApiError) {
      if (err.status === 409) {
        setBanner({ kind: "conflict", text: "This action was changed by someone else." });
        return;
      }
      if (err.status === 400 && Object.keys(err.fields).length > 0) {
        setErrors(err.fields);
        // Move focus to the first field that needs attention
        setTimeout(() => sectionRef.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus(), 0);
        return;
      }
      setBanner({ kind: "error", text: err.message });
      if (err.code === "TICKET_LOCKED") fetchActions();
      return;
    }
    setBanner({ kind: "error", text: NETWORK_ERROR });
  };

  const submit = async (work: () => Promise<void>) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setBanner(null);
    try {
      await work();
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const openCreate = () => {
    const nowLocal = toDateTimeLocal(new Date());
    setCreateDefaultActionAt(nowLocal);
    setCreateValues({
      actionAt: nowLocal, description: "", result: "", followUpRequired: false,
      followUpNote: "", attachmentNotes: "", assigneeId: user?.id ?? assigneeOptions[0]?.id ?? 0,
    });
    setCreateErrors({});
    setCreating(true);
  };

  const closeCreate = () => {
    setCreating(false);
    setCreateErrors({});
    setTimeout(() => addButtonRef.current?.focus(), 0);
  };

  const handleCreate = () => submit(async () => {
    if (!createValues) return;
    setCreateErrors({});
    try {
      await apiPost(`/staff/tickets/${ticketId}/actions`, toPayload(createValues, createDefaultActionAt));
      setCreating(false);
      setCreateValues(null);
      setNotice("Action saved");
      await fetchActions();
      onChanged?.();
      setTimeout(() => addButtonRef.current?.focus(), 0);
    } catch (err) {
      showError(err, setCreateErrors);
    }
  });

  const toggleExpanded = (action: ActionTaken) => {
    setConfirmingCancel(false);
    setEditErrors({});
    if (expandedId === action.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(action.id);
    setEditValues(fromAction(action));
  };

  const closeExpanded = (actionId: number) => {
    setExpandedId(null);
    setConfirmingCancel(false);
    setTimeout(() => toggleRefs.current[actionId]?.focus(), 0);
  };

  const handleUpdate = (action: ActionTaken, intent: "save" | "complete" | "cancel") => submit(async () => {
    if (!editValues) return;
    setEditErrors({});
    const body = intent === "cancel"
      ? { expectedVersion: action.version, status: "CANCELLED" }
      : { expectedVersion: action.version, ...toPayload(editValues, toDateTimeLocal(action.actionAt)), ...(intent === "complete" ? { status: "COMPLETED" } : {}) };
    try {
      await apiPatch(`/staff/tickets/${ticketId}/actions/${action.id}`, body);
      setNotice(intent === "complete" ? "Action marked Completed" : intent === "cancel" ? "Action cancelled" : "Action saved");
      setConfirmingCancel(false);
      await fetchActions();
      onChanged?.();
      if (intent !== "save") closeExpanded(action.id);
    } catch (err) {
      setConfirmingCancel(false);
      showError(err, setEditErrors);
    }
  });

  const reloadAfterConflict = async () => {
    setBanner(null);
    await fetchActions(); // the open form keeps the user's text and now edits the latest version
  };

  const heading = isStaff ? `Actions Taken (${actions.length})` : "Work Performed by IT";
  const emptyText = isStaff
    ? "No actions recorded yet. Add the first action to track the work."
    : "IT has not recorded any actions yet.";

  return (
    <section ref={sectionRef} className="card p-4 mb-3" aria-labelledby={`actions-heading-${ticketId}`}>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
        <h3 id={`actions-heading-${ticketId}`} className="mb-0">{heading}</h3>
        {canWrite && !creating && (
          <button ref={addButtonRef} className="btn btn-primary" onClick={openCreate}>+ Add Action</button>
        )}
      </div>

      {isStaff && !canWrite && (
        <p className="text-muted small mt-2 mb-0">This ticket is closed. Actions Taken are read-only.</p>
      )}

      <div role="status" aria-live="polite">
        {notice && <div className="alert alert-success py-2 mt-3 mb-0">{notice}</div>}
      </div>

      {banner && (
        <div className={`alert ${banner.kind === "conflict" ? "alert-warning" : "alert-danger"} mt-3 mb-0 d-flex justify-content-between align-items-center flex-wrap gap-2`} role="alert">
          <span>{banner.text}</span>
          {banner.kind === "conflict"
            ? <button className="btn btn-sm btn-outline-dark" onClick={reloadAfterConflict}>Reload</button>
            : <button className="btn btn-sm btn-outline-dark" onClick={() => setBanner(null)}>Dismiss</button>}
        </div>
      )}

      {creating && createValues && (
        <div className="border rounded p-3 mt-3" style={{ backgroundColor: "var(--color-bg)" }}>
          <h4 className="h6">New Action</h4>
          <ActionForm idPrefix="new-action" values={createValues} errors={createErrors} staffUsers={assigneeOptions}
            performedByName={user?.name ?? ""} disabled={submitting} onChange={setCreateValues}
            descriptionRef={createDescriptionRef} />
          <div className="d-flex gap-2 mt-3 flex-wrap">
            <button className="btn btn-primary" onClick={handleCreate} disabled={submitting}>
              {submitting ? "Saving…" : "Save Action"}
            </button>
            <button className="btn btn-outline-secondary" onClick={closeCreate} disabled={submitting}>Cancel</button>
          </div>
        </div>
      )}

      {loadState === "loading" && <p className="mt-3 mb-0" aria-busy="true">Loading actions…</p>}
      {loadState === "error" && (
        <div className="alert alert-danger mt-3 mb-0 d-flex justify-content-between align-items-center" role="alert">
          <span>Unable to load Actions Taken.</span>
          <button className="btn btn-sm btn-outline-dark" onClick={fetchActions}>Retry</button>
        </div>
      )}
      {loadState === "loaded" && actions.length === 0 && <p className="text-muted mt-3 mb-0">{emptyText}</p>}

      {loadState === "loaded" && actions.length > 0 && (
        <>
          <div className="row small fw-semibold text-muted border-bottom pb-2 mt-3 d-none d-md-flex" aria-hidden="true">
            <div className="col-md-2">Date/Time</div>
            <div className="col-md-3">Description</div>
            <div className="col-md-2">Performed by</div>
            <div className="col-md-2">Assignee</div>
            <div className="col-md-2">Status</div>
            <div className="col-md-1" />
          </div>
          <ul className="list-unstyled mb-0" aria-label="Actions Taken" data-testid="actions-list">
            {actions.map((a) => {
              const expanded = expandedId === a.id;
              const editable = canWrite && a.status === "PLANNED";
              return (
                <li key={a.id} className="border-bottom py-2" data-testid="action-row">
                  <div className="row g-1 align-items-center">
                    <div className="col-12 col-md-2 small">
                      <span className="d-md-none text-muted">Date/Time: </span>{formatDateTime(a.actionAt)}
                    </div>
                    <div className="col-12 col-md-3" style={{ minWidth: 0 }}>
                      <span className="d-block text-truncate" title={a.description}>{a.description}</span>
                    </div>
                    <div className="col-6 col-md-2 small">
                      <span className="d-md-none text-muted">Performed by: </span>{a.performedBy.name}
                    </div>
                    <div className="col-6 col-md-2 small">
                      <span className="d-md-none text-muted">Assignee: </span>{a.assignee.name}
                    </div>
                    <div className="col-8 col-md-2 d-flex flex-wrap gap-1">
                      <ActionStatusBadge status={a.status} />
                      {a.followUpRequired && <FollowUpBadge />}
                    </div>
                    <div className="col-4 col-md-1 text-end">
                      <button ref={(el) => { toggleRefs.current[a.id] = el; }} className="btn btn-sm btn-outline-secondary"
                        aria-expanded={expanded} aria-controls={`action-panel-${a.id}`} onClick={() => toggleExpanded(a)}>
                        {editable ? "Edit" : "View"}
                      </button>
                    </div>
                  </div>

                  {expanded && (
                    <div id={`action-panel-${a.id}`} className="border rounded p-3 mt-2" style={{ backgroundColor: "var(--color-bg)" }}>
                      {editable && editValues ? (
                        <>
                          <ActionForm idPrefix={`action-${a.id}`} values={editValues} errors={editErrors} staffUsers={assigneeOptions}
                            performedByName={a.performedBy.name} disabled={submitting} onChange={setEditValues} />
                          {confirmingCancel ? (
                            <div className="alert alert-warning mt-3 mb-0 d-flex flex-wrap align-items-center gap-2" role="alert">
                              <span className="me-auto">Cancel this action? It stays in the list as Cancelled and can no longer be edited.</span>
                              <button className="btn btn-sm btn-danger" onClick={() => handleUpdate(a, "cancel")} disabled={submitting}>
                                Yes, cancel action
                              </button>
                              <button className="btn btn-sm btn-outline-secondary" onClick={() => setConfirmingCancel(false)} disabled={submitting}>
                                Keep it
                              </button>
                            </div>
                          ) : (
                            <div className="d-flex gap-2 mt-3 flex-wrap">
                              <button className="btn btn-primary" onClick={() => handleUpdate(a, "save")} disabled={submitting}>
                                {submitting ? "Saving…" : "Save Changes"}
                              </button>
                              <button className="btn btn-outline-success" onClick={() => handleUpdate(a, "complete")} disabled={submitting}>
                                Mark Completed
                              </button>
                              <button className="btn btn-outline-danger" onClick={() => setConfirmingCancel(true)} disabled={submitting}>
                                Cancel Action
                              </button>
                              <button className="btn btn-link ms-auto" onClick={() => closeExpanded(a.id)} disabled={submitting}>Close</button>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <ReadOnlyDetails action={a} />
                          <div className="text-end mt-2">
                            <button className="btn btn-link" onClick={() => closeExpanded(a.id)}>Close</button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
