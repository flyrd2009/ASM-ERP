import { useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../api/client";
import { getErrorMessage } from "../utils/apiError";
import PasswordInput from "../components/PasswordInput";

const RULES = [
  { key: "length", label: "At least 8 characters", test: (p) => p.length >= 8 },
  { key: "lower", label: "One lowercase letter", test: (p) => /[a-z]/.test(p) },
  { key: "upper", label: "One uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { key: "number", label: "One number", test: (p) => /[0-9]/.test(p) },
  { key: "special", label: "One special character", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

// A verification code is now required for every reset — first login,
// admin unlock, or forgot-password — not just the forgot-password path.
// The code is always emailed by the backend the moment this screen becomes
// necessary (see authController: login/verifyOtpLogin send it as soon as
// they detect forcePasswordReset), so it's always waiting by the time
// someone lands here.
export default function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();
  const userId = location.state?.userId;

  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const submittingRef = useRef(false);

  const passedRules = RULES.filter((r) => r.test(newPassword));
  const strength = passedRules.length;

  async function handleSubmit(e) {
    e.preventDefault();
    if (submittingRef.current) return;
    setError("");

    if (!/^\d{6}$/.test(otp.trim())) {
      setError("Enter the 6-digit code sent to your email.");
      return;
    }
    if (newPassword !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (strength < RULES.length) {
      setError("Password does not meet all requirements below.");
      return;
    }

    submittingRef.current = true;
    setLoading(true);
    try {
      await api.post("/auth/reset-password", {
        userId,
        newPassword,
        otp: otp.trim(),
      });
      setSuccess(true);
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      const msg = getErrorMessage(err, "Could not reset password. Try again.");
      if (msg) setError(msg);
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  }

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <p className="text-slate-600">
          This page can only be reached from the login flow.{" "}
          <button onClick={() => navigate("/login")} className="text-[var(--brand-primary)] hover:underline">
            Back to login
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-lg shadow-md p-8">
        <h1 className="text-lg font-bold text-slate-800 mb-1">Set a new password</h1>
        <p className="text-sm text-slate-500 mb-6">
          We've emailed you a verification code. Enter it below along with your new password.
        </p>

        {success ? (
          <p className="text-sm text-green-600">Password updated. Redirecting to login...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label className="block text-sm font-medium text-slate-700">Verification Code</label>
              <input
                type="text"
                inputMode="numeric"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                maxLength={6}
                className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2 text-sm tracking-widest focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">New Password</label>
              <PasswordInput
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                maxLength={200}
                className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                required
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Confirm New Password</label>
              <PasswordInput
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                maxLength={200}
                className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                required
                autoComplete="new-password"
              />
            </div>

            <ul className="text-xs space-y-1">
              {RULES.map((r) => (
                <li key={r.key} className={r.test(newPassword) ? "text-green-600" : "text-slate-400"}>
                  {r.test(newPassword) ? "✓" : "○"} {r.label}
                </li>
              ))}
            </ul>

            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[var(--brand-primary)] text-white rounded-md py-2 text-sm font-medium hover:bg-[var(--brand-primary-dark)] disabled:opacity-60"
            >
              {loading ? "Updating..." : "Update password"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="w-full text-sm text-slate-500 hover:underline"
            >
              Cancel
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
