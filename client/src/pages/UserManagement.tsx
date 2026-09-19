import { useEffect, useState, useCallback } from "react";
import { apiGet, apiPost, apiPatch, ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import AppShell from "../components/shell/AppShell";

type User = { id: number; name: string; email: string; role: string; isActive: boolean };
type FormMode = "closed" | "create" | "edit";

const initialForm = { name: "", email: "", role: "REQUESTER", isActive: true, initialPassword: "" };

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");

  const [formMode, setFormMode] = useState<FormMode>("closed");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState(initialForm);
  const [formError, setFormError] = useState("");
  const [formNotice, setFormNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  const fetchUsers = useCallback(async () => {
    setStatus("loading");
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (roleFilter) params.set("role", roleFilter);
      const data = await apiGet<User[]>(`/admin/users?${params}`);
      setUsers(data);
      setStatus("loaded");
    } catch {
      setStatus("error");
    }
  }, [search, roleFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const resetFormState = () => {
    setFormError("");
    setFormNotice("");
    setResettingPassword(false);
    setNewPassword("");
  };

  const openCreate = () => {
    resetFormState();
    setForm(initialForm);
    setEditingUser(null);
    setFormMode("create");
  };

  const openEdit = (u: User) => {
    resetFormState();
    setForm({ name: u.name, email: u.email, role: u.role, isActive: u.isActive, initialPassword: "" });
    setEditingUser(u);
    setFormMode("edit");
  };

  const closeForm = () => setFormMode("closed");

  const errorMessage = (err: unknown, fallback: string) => (err instanceof ApiError ? err.message : fallback);

  const handleSave = async () => {
    setSaving(true);
    setFormError("");
    try {
      if (formMode === "create") {
        await apiPost("/admin/users", form);
      } else if (formMode === "edit" && editingUser) {
        await apiPatch(`/admin/users/${editingUser.id}`, {
          name: form.name, email: form.email, role: form.role, isActive: form.isActive,
        });
      }
      closeForm();
      await fetchUsers();
    } catch (err) {
      setFormError(errorMessage(err, "Unable to save user"));
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!editingUser) return;
    setSaving(true);
    setFormError("");
    try {
      await apiPatch(`/admin/users/${editingUser.id}`, { isActive: false });
      closeForm();
      await fetchUsers();
    } catch (err) {
      setFormError(errorMessage(err, "Unable to deactivate user"));
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!editingUser) return;
    setFormError("");
    setFormNotice("");
    try {
      await apiPatch(`/admin/users/${editingUser.id}/reset-password`, { newInitialPassword: newPassword });
      setResettingPassword(false);
      setNewPassword("");
      setFormNotice("Password reset. The user must change it at next login.");
    } catch (err) {
      setFormError(errorMessage(err, "Unable to reset password"));
    }
  };

  const isSelf = editingUser?.id === currentUser?.id;
  const roleBadgeClass = (r: string) =>
    r === "ADMINISTRATOR" ? "bg-primary" : r === "IT_STAFF" ? "bg-secondary" : "bg-success";

  return (
    <AppShell>
      <div className="row">
        <div className={formMode === "closed" ? "col-12" : "col-md-7"}>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h2>Users</h2>
            <button className="btn btn-primary" onClick={openCreate}>+ Create User</button>
          </div>

          <div className="d-flex gap-2 mb-3">
            <input className="form-control" placeholder="Search users..." aria-label="Search users"
              value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className="form-select" style={{ maxWidth: 200 }} aria-label="Filter by role" value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="">All Roles</option>
              <option value="REQUESTER">Requester</option>
              <option value="IT_STAFF">IT Staff</option>
              <option value="ADMINISTRATOR">Administrator</option>
            </select>
          </div>

          {status === "loading" && <p>⏳ loading...</p>}
          {status === "error" && <p className="text-danger">Unable to load users.</p>}

          {status === "loaded" && (
            <div className="table-responsive">
            <table className="table">
              <thead><tr><th>Name</th><th>Role</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} data-testid="user-row">
                    <td>{u.name}<div className="text-muted small text-break">{u.email}</div></td>
                    <td><span className={`badge ${roleBadgeClass(u.role)}`}>{u.role}</span></td>
                    <td><span className={`badge ${u.isActive ? "bg-success" : "bg-danger"}`}>{u.isActive ? "Active" : "Inactive"}</span></td>
                    <td><button className="btn btn-sm btn-outline-secondary" onClick={() => openEdit(u)}>Edit</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>

        {formMode !== "closed" && (
          <div className="col-md-5">
            <div className="card p-4">
              <div className="d-flex justify-content-between">
                <h4>{formMode === "create" ? "Create New User" : "Edit User"}</h4>
                <button className="btn-close" aria-label="Close" onClick={closeForm}></button>
              </div>

              {formError && <div className="alert alert-danger" role="alert">{formError}</div>}
              {formNotice && <div className="alert alert-success" role="status">{formNotice}</div>}

              <label htmlFor="user-name" className="mt-2">Full Name *</label>
              <input id="user-name" className="form-control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />

              <label htmlFor="user-email" className="mt-2">Email Address *</label>
              <input id="user-email" className="form-control" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />

              <label htmlFor="user-role" className="mt-2">Role *</label>
              <select id="user-role" className="form-select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="REQUESTER">Requester</option>
                <option value="IT_STAFF">IT Staff</option>
                <option value="ADMINISTRATOR">Administrator</option>
              </select>

              <div className="form-check form-switch mt-2">
                <input id="user-active" className="form-check-input" type="checkbox" checked={form.isActive}
                  disabled={isSelf}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                <label htmlFor="user-active" className="form-check-label">Active</label>
                {isSelf && <div className="text-muted small">You cannot deactivate your own account.</div>}
              </div>

              {formMode === "create" && (
                <>
                  <label htmlFor="user-initial-password" className="mt-2">Initial Password *</label>
                  <input id="user-initial-password" className="form-control" type="text" value={form.initialPassword}
                    onChange={(e) => setForm({ ...form, initialPassword: e.target.value })} />
                  <div className="text-muted small">User will set password on first login.</div>
                </>
              )}

              <button className="btn btn-primary mt-3" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save User"}
              </button>

              {formMode === "edit" && (
                <>
                  {resettingPassword ? (
                    <div className="mt-2">
                      <label htmlFor="user-new-password">New Initial Password</label>
                      <div className="d-flex gap-2">
                        <input id="user-new-password" className="form-control" type="text" value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)} />
                        <button className="btn btn-primary" onClick={handleResetPassword}>Confirm</button>
                      </div>
                    </div>
                  ) : (
                    <button className="btn btn-outline-secondary mt-2 w-100" onClick={() => { setResettingPassword(true); setFormNotice(""); }}>
                      Set New Initial Password
                    </button>
                  )}
                  <button className="btn btn-outline-danger mt-2" onClick={handleDeactivate} disabled={isSelf || saving}>
                    Deactivate User
                  </button>
                </>
              )}

              <button className="btn btn-outline-secondary mt-2" onClick={closeForm}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
