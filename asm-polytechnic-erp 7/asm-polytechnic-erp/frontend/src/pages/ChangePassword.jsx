import { useState } from "react";
import api from "../api/client";
import PasswordInput from "../components/PasswordInput";

const RULES = [
  { key: "length", label: "At least 8 characters", test: (p) => p.length >= 8 },
  { key: "lower", label: "One lowercase letter", test: (p) => /[a-z]/.test(p) },
  { key: "upper", label: "One uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { key: "number", label: "One number", test: (p) => /[0-9]/.test(p) },
  { key: "special", label: "One special character", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export default function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const strength = RULES.filter((r) => r.test(newPassword)).length;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword !== confirm) {
      setError("New passwords do not match.");
      return;
    }
    if (strength < RULES.length) {
      setError("New password does not meet all requirements below.");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/auth/change-password", { currentPassword, newPassword });
      setSuccess(data.message);
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
    } catch (err) {
      setError(err.response?.data?.error || "Could not change password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md p-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-xl font-bold text-slate-800 mb-1">Change Password</h1>
        <p className="text-sm text-slate-500 mb-6">Update your password. You'll stay signed in here, but other devices will be signed out.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Current Password</label>
            <PasswordInput
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
              autoComplete="current-password"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">New Password</label>
            <PasswordInput
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
              autoComplete="new-password"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Confirm New Password</label>
            <PasswordInput
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
              autoComplete="new-password"
              required
            />
          </div>

          <ul className="text-xs space-y-1">
            {RULES.map((r) => (
              <li key={r.key} className={r.test(newPassword) ? "text-green-600" : "text-slate-400"}>
                {r.test(newPassword) ? "✓" : "○"} {r.label}
              </li>
            ))}
          </ul>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-green-600">{success}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[var(--brand-primary)] text-white rounded-md py-2 text-sm font-medium hover:bg-[var(--brand-primary-dark)] disabled:opacity-60"
          >
            {loading ? "Updating..." : "Change Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
