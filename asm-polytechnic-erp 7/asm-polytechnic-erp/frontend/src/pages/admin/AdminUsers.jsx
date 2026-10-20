import { useEffect, useState, useCallback } from "react";
import api from "../../api/client";
import { getErrorMessage } from "../../utils/apiError";
import Avatar from "../../components/Avatar";
import PhotoUploader from "../../components/PhotoUploader";
import AvailabilityHint from "../../components/AvailabilityHint";

const ROLES = ["admin", "faculty", "student", "parent", "accounts"];
const BRANCHES = ["Computer Engineering", "Mechanical Engineering", "Civil Engineering", "Electrical Engineering", "Electronics Engineering"];

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [actionMsg, setActionMsg] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      const { data } = await api.get("/admin/users", { params });
      setUsers(data.users);
      setError("");
    } catch (err) {
      setError(getErrorMessage(err, "Could not load users.") || "Could not load users.");
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleUnlock(userId, name) {
    if (!confirm(`Unlock ${name}'s account? They will be required to set a new password.`)) return;
    try {
      const { data } = await api.post(`/admin/users/${userId}/unlock`);
      setActionMsg(`${data.message} Temp password: ${data.tempPassword}`);
      load();
    } catch (err) {
      setActionMsg(getErrorMessage(err, "Unlock failed.") || "Unlock failed.");
    }
  }

  async function handleStatus(userId, status, name) {
    const verb = status === "disabled" ? "disable" : "enable";
    if (!confirm(`${verb === "disable" ? "Disable" : "Enable"} ${name}'s account?`)) return;
    try {
      const { data } = await api.patch(`/admin/users/${userId}/status`, { status });
      setActionMsg(data.message);
      load();
    } catch (err) {
      setActionMsg(getErrorMessage(err, "Action failed.") || "Action failed.");
    }
  }

  async function handleResetPassword(userId, name) {
    if (!confirm(`Force a password reset for ${name} on next login?`)) return;
    try {
      const { data } = await api.post(`/admin/users/${userId}/reset-password`);
      setActionMsg(`${data.message} Temp password: ${data.tempPassword}`);
      load();
    } catch (err) {
      setActionMsg(getErrorMessage(err, "Action failed.") || "Action failed.");
    }
  }

  async function handleDelete(userId) {
    try {
      const { data } = await api.delete(`/admin/users/${userId}`);
      setActionMsg(data.message);
      setDeleteTarget(null);
      load();
    } catch (err) {
      setActionMsg(getErrorMessage(err, "Delete failed.") || "Delete failed.");
      setDeleteTarget(null);
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold text-slate-800">User Management</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-[var(--brand-primary)] text-white text-sm rounded-md px-4 py-2 hover:bg-[var(--brand-primary-dark)]"
        >
          + Add User
        </button>
      </div>

      <div className="flex gap-3 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, login ID, email..."
          className="border border-slate-300 rounded-md px-3 py-2 text-sm flex-1"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="border border-slate-300 rounded-md px-3 py-2 text-sm"
        >
          <option value="">All roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      {actionMsg && <p className="text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-md px-3 py-2 mb-4">{actionMsg}</p>}
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-left">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Login ID</th>
              <th className="px-4 py-2">Role</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">Loading...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">No users found.</td></tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-t border-slate-100">
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <Avatar photoUrl={u.photoUrl} name={u.fullName} size="w-7 h-7" text="text-xs" />
                      {u.fullName}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-slate-500">{u.loginId}</td>
                  <td className="px-4 py-2 capitalize">{u.role}</td>
                  <td className="px-4 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      u.status === "active" ? "bg-green-100 text-green-700" :
                      u.status === "locked" ? "bg-amber-100 text-amber-700" :
                      "bg-slate-200 text-slate-600"
                    }`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 space-x-2">
                    {u.status === "locked" && (
                      <button onClick={() => handleUnlock(u.id, u.fullName)} className="text-[var(--brand-primary)] hover:underline text-xs">Unlock</button>
                    )}
                    <button onClick={() => handleResetPassword(u.id, u.fullName)} className="text-[var(--brand-primary)] hover:underline text-xs">Reset PW</button>
                    {u.status === "disabled" ? (
                      <button onClick={() => handleStatus(u.id, "active", u.fullName)} className="text-green-700 hover:underline text-xs">Enable</button>
                    ) : (
                      <button onClick={() => handleStatus(u.id, "disabled", u.fullName)} className="text-red-600 hover:underline text-xs">Disable</button>
                    )}
                    <button onClick={() => setEditTarget(u)} className="text-[var(--brand-primary)] hover:underline text-xs">Edit</button>
                    <button onClick={() => setDeleteTarget(u)} className="text-red-600 hover:underline text-xs font-medium">Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreated={(msg) => {
            setActionMsg(msg);
            setShowCreate(false);
            load();
          }}
        />
      )}

      {deleteTarget && (
        <DeleteUserModal
          user={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => handleDelete(deleteTarget.id)}
        />
      )}

      {editTarget && (
        <EditUserModal
          user={editTarget}
          onClose={() => setEditTarget(null)}
          onPhotoChanged={load}
          onSaved={(msg) => {
            setActionMsg(msg);
            setEditTarget(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function DeleteUserModal({ user, onCancel, onConfirm }) {
  const [confirmText, setConfirmText] = useState("");
  const canDelete = confirmText.trim() === user.fullName;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full">
        <h2 className="text-lg font-semibold text-red-600 mb-1">Delete Account</h2>
        <p className="text-sm text-slate-600 mb-3">
          This permanently deletes <span className="font-medium">{user.fullName}</span>'s account
          ({user.role}, {user.loginId}). {user.role === "student" && "Their academic profile, documents, and certificate requests will be deleted too. "}
          This cannot be undone.
        </p>
        <label className="block text-xs text-slate-500 mb-1">
          Type <span className="font-mono font-medium">{user.fullName}</span> to confirm:
        </label>
        <input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm mb-4"
          autoFocus
        />
        <div className="flex gap-2">
          <button
            onClick={onConfirm}
            disabled={!canDelete}
            className="flex-1 bg-red-600 text-white rounded-md py-2 text-sm font-medium hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Delete permanently
          </button>
          <button onClick={onCancel} className="flex-1 border border-slate-300 rounded-md py-2 text-sm text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// One form for both the login account AND (for students) their academic
// profile — previously these were two separate steps on two separate
// pages, and the second step required manually typing a UUID that was
// never actually shown anywhere in the UI. That's gone now: creating a
// student here creates both in a single atomic request.
function CreateUserModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ loginId: "", email: "", fullName: "", role: "student", phone: "" });
  const [profile, setProfile] = useState({ enrollmentNo: "", branch: BRANCHES[0], batchYear: new Date().getFullYear(), currentSemester: 1 });
  const [includeProfile, setIncludeProfile] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [taken, setTaken] = useState({});
  const mark = (field) => (available) => setTaken((t) => ({ ...t, [field]: available === false }));
  const hasDuplicate = Object.values(taken).some(Boolean);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload = { ...form };
      if (form.role === "student" && includeProfile) {
        payload.studentProfile = profile;
      }
      const { data } = await api.post("/admin/users", payload);
      onCreated(`${data.message} (temp password: ${data.tempPassword})`);
    } catch (err) {
      setError(getErrorMessage(err, "Could not create user.") || "Could not create user.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 py-8 px-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full my-auto">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Add User</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input required placeholder="Full name" value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          <input required placeholder="Login ID (enrollment no. / employee ID)" value={form.loginId}
            onChange={(e) => setForm({ ...form, loginId: e.target.value })}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          <AvailabilityHint field="loginId" value={form.loginId} onResult={mark("loginId")} />
          <input required type="email" placeholder="Email" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          <AvailabilityHint field="email" value={form.email} onResult={mark("email")} />
          <input placeholder="Phone (optional)" value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          <AvailabilityHint field="phone" value={form.phone} onResult={mark("phone")} />
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm">
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>

          {form.role === "student" && (
            <div className="border border-slate-200 rounded-md p-3 space-y-2 bg-slate-50">
              <label className="flex items-center gap-2 text-xs text-slate-600">
                <input type="checkbox" checked={includeProfile} onChange={(e) => setIncludeProfile(e.target.checked)} />
                Also set up their academic profile now (recommended)
              </label>

              {includeProfile && (
                <>
                  <input required placeholder="Enrollment No." value={profile.enrollmentNo}
                    onChange={(e) => setProfile({ ...profile, enrollmentNo: e.target.value })}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          <AvailabilityHint field="enrollmentNo" value={profile.enrollmentNo} onResult={mark("enrollmentNo")} />
                  <select value={profile.branch} onChange={(e) => setProfile({ ...profile, branch: e.target.value })}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm">
                    {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                  <div className="flex gap-2">
                    <input required type="number" placeholder="Batch year" value={profile.batchYear}
                      onChange={(e) => setProfile({ ...profile, batchYear: Number(e.target.value) })}
                      className="w-1/2 border border-slate-300 rounded-md px-3 py-2 text-sm" />
                    <input required type="number" min="1" max="8" placeholder="Semester" value={profile.currentSemester}
                      onChange={(e) => setProfile({ ...profile, currentSemester: Number(e.target.value) })}
                      className="w-1/2 border border-slate-300 rounded-md px-3 py-2 text-sm" />
                  </div>
                </>
              )}
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={loading || hasDuplicate}
              className="flex-1 bg-[var(--brand-primary)] text-white rounded-md py-2 text-sm font-medium hover:bg-[var(--brand-primary-dark)] disabled:opacity-60">
              {loading ? "Creating..." : "Create"}
            </button>
            <button type="button" onClick={onClose}
              className="flex-1 border border-slate-300 rounded-md py-2 text-sm text-slate-700 hover:bg-slate-50">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Fixes a mistyped name/email/phone/Login ID after the fact. Deliberately
// doesn't touch role, password, or status — those have their own dedicated,
// more careful flows elsewhere on this page.
function EditUserModal({ user, onClose, onSaved, onPhotoChanged }) {
  const [form, setForm] = useState({
    fullName: user.fullName || "",
    loginId: user.loginId || "",
    email: user.email || "",
    phone: user.phone || "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [taken, setTaken] = useState({});
  const mark = (field) => (available) => setTaken((t) => ({ ...t, [field]: available === false }));
  const hasDuplicate = Object.values(taken).some(Boolean);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.patch(`/admin/users/${user.id}`, form);
      onSaved(data.message);
    } catch (err) {
      setError(getErrorMessage(err, "Could not save changes.") || "Could not save changes.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full">
        <h2 className="text-lg font-semibold text-slate-800 mb-1">Edit Account</h2>
        <p className="text-xs text-slate-500 mb-4">
          Fix a typo in this account's details. Role, password, and status are managed separately.
        </p>
        <div className="mb-4 pb-4 border-b border-slate-100">
          <PhotoUploader
            endpoint={`/admin/users/${user.id}/photo`}
            currentUrl={user.photoUrl}
            name={user.fullName}
            onUploaded={() => onPhotoChanged?.()}
          />
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input required placeholder="Full name" value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          <input required placeholder="Login ID" value={form.loginId}
            onChange={(e) => setForm({ ...form, loginId: e.target.value })}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          <AvailabilityHint field="loginId" value={form.loginId} original={user.loginId} excludeUserId={user.id} onResult={mark("loginId")} />
          <input required type="email" placeholder="Email" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          <AvailabilityHint field="email" value={form.email} original={user.email} excludeUserId={user.id} onResult={mark("email")} />
          <input placeholder="Phone (optional)" value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          <AvailabilityHint field="phone" value={form.phone} original={user.phone} excludeUserId={user.id} onResult={mark("phone")} />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={loading || hasDuplicate}
              className="flex-1 bg-[var(--brand-primary)] text-white rounded-md py-2 text-sm font-medium hover:bg-[var(--brand-primary-dark)] disabled:opacity-60">
              {loading ? "Saving..." : "Save changes"}
            </button>
            <button type="button" onClick={onClose}
              className="flex-1 border border-slate-300 rounded-md py-2 text-sm text-slate-700 hover:bg-slate-50">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
