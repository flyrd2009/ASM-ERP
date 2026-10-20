import { useEffect, useState } from "react";
import api from "../../api/client";

export default function AdminSecuritySettings() {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/security-settings");
      setSettings(data.settings);
    } catch {
      setMsg("Could not load settings.");
    } finally {
      setLoading(false);
    }
  }

  async function saveRow(role, updates) {
    try {
      await api.patch(`/admin/security-settings/${role}`, updates);
      setMsg(`Updated settings for ${role}.`);
      load();
    } catch (err) {
      setMsg(err.response?.data?.error || "Update failed.");
    }
  }

  if (loading) return <div className="p-6 text-slate-400">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-xl font-bold text-slate-800 mb-4">Security Settings</h1>
      {msg && <p className="text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-md px-3 py-2 mb-4">{msg}</p>}

      <div className="space-y-4">
        {settings.map((s) => (
          <SettingRow key={s.role} setting={s} onSave={(updates) => saveRow(s.role, updates)} />
        ))}
      </div>
    </div>
  );
}

function SettingRow({ setting, onSave }) {
  const [form, setForm] = useState({
    sessionTimeoutMinutes: setting.sessionTimeoutMinutes,
    maxFailedAttempts: setting.maxFailedAttempts,
    lockoutMinutes: setting.lockoutMinutes,
    forcePasswordResetOnUnlock: setting.forcePasswordResetOnUnlock,
    singleSessionEnforced: setting.singleSessionEnforced,
  });
  const [dirty, setDirty] = useState(false);

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <h3 className="font-semibold text-slate-800 capitalize mb-3">{setting.role}</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-slate-500">Session timeout (min)</span>
          <input type="number" value={form.sessionTimeoutMinutes}
            onChange={(e) => update("sessionTimeoutMinutes", Number(e.target.value))}
            className="border border-slate-300 rounded-md px-2 py-1" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-slate-500">Max failed attempts</span>
          <input type="number" value={form.maxFailedAttempts}
            onChange={(e) => update("maxFailedAttempts", Number(e.target.value))}
            className="border border-slate-300 rounded-md px-2 py-1" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-slate-500">Lockout duration (min)</span>
          <input type="number" value={form.lockoutMinutes}
            onChange={(e) => update("lockoutMinutes", Number(e.target.value))}
            className="border border-slate-300 rounded-md px-2 py-1" />
        </label>
        <label className="flex items-center gap-2 pt-5">
          <input type="checkbox" checked={form.forcePasswordResetOnUnlock}
            onChange={(e) => update("forcePasswordResetOnUnlock", e.target.checked)} />
          <span className="text-slate-600">Force reset on unlock</span>
        </label>
        <label className="flex items-center gap-2 pt-5">
          <input type="checkbox" checked={form.singleSessionEnforced}
            onChange={(e) => update("singleSessionEnforced", e.target.checked)} />
          <span className="text-slate-600">Single session only</span>
        </label>
      </div>

      {dirty && (
        <button
          onClick={() => { onSave(form); setDirty(false); }}
          className="mt-3 bg-[var(--brand-primary)] text-white text-xs rounded-md px-3 py-1.5 hover:bg-[var(--brand-primary-dark)]"
        >
          Save changes
        </button>
      )}
    </div>
  );
}
