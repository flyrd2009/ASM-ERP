import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/client";
import { getErrorMessage } from "../utils/apiError";

const RESEND_COOLDOWN_SECONDS = 30;

export default function ForgotPassword() {
  const [channel, setChannel] = useState("email");
  const [identifier, setIdentifier] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(typeof navigator !== "undefined" && !navigator.onLine);
  const [cooldown, setCooldown] = useState(0);
  const navigate = useNavigate();

  const submittingRef = useRef(false);
  const abortRef = useRef(null);
  const navigateTimerRef = useRef(null);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
      abortRef.current?.abort();
      clearTimeout(navigateTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (submittingRef.current || cooldown > 0) return;

    const trimmed = identifier.trim();
    if (!trimmed) {
      setError(channel === "mobile" ? "Enter your mobile number." : "Enter your email, enrollment number, or employee ID.");
      return;
    }

    submittingRef.current = true;
    setError("");
    setLoading(true);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const { data } = await api.post("/auth/forgot-password", { identifier: trimmed, channel }, { signal: controller.signal });
      setSent(true);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      // Backend intentionally always returns the same 200 shape whether or
      // not the account exists — it only includes userId when a matching
      // account was found, so we only advance to the reset step then.
      // The OTP itself is never returned here — it only ever reaches the
      // user by email/WhatsApp, exactly like a real password-reset flow should.
      if (data.userId) {
        navigateTimerRef.current = setTimeout(
          () => navigate("/reset-password", { state: { userId: data.userId, requiresOtp: true } }),
          1500
        );
      }
    } catch (err) {
      const msg = getErrorMessage(err, "Something went wrong. Please try again.");
      if (msg) setError(msg);
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-lg shadow-md p-8">
        <h1 className="text-lg font-bold text-slate-800 mb-1">Forgot password</h1>
        <p className="text-sm text-slate-500 mb-6">Choose how you'd like to receive your reset code.</p>

        {offline && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mb-4">
            You're offline. Reconnect before requesting a code.
          </p>
        )}

        {sent ? (
          <div className="space-y-3">
            <p className="text-sm text-green-600">
              If that account exists, a reset code has been sent{channel === "mobile" ? " on WhatsApp" : " to the registered email"}. Check {channel === "mobile" ? "your WhatsApp" : "your inbox (and spam folder)"}.
            </p>
            <button
              onClick={handleSubmit}
              disabled={cooldown > 0 || loading || offline}
              className="text-sm text-[var(--brand-primary)] hover:underline disabled:text-slate-400 disabled:no-underline disabled:cursor-not-allowed"
            >
              {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="flex rounded-md border border-slate-300 overflow-hidden text-sm">
              <button
                type="button"
                onClick={() => { setChannel("email"); setError(""); }}
                className={`flex-1 py-2 ${channel === "email" ? "bg-[var(--brand-primary)] text-white" : "bg-white text-slate-600"}`}
              >
                Email
              </button>
              <button
                type="button"
                onClick={() => { setChannel("mobile"); setError(""); }}
                className={`flex-1 py-2 ${channel === "mobile" ? "bg-[var(--brand-primary)] text-white" : "bg-white text-slate-600"}`}
              >
                Mobile (WhatsApp)
              </button>
            </div>

            <input
              type={channel === "mobile" ? "tel" : "text"}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={channel === "mobile" ? "Registered mobile number (WhatsApp)" : "Email, enrollment number, or employee ID"}
              maxLength={100}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
              required
              autoComplete={channel === "mobile" ? "tel" : "username"}
              autoFocus
            />
            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
            <button
              disabled={loading || offline}
              className="w-full bg-[var(--brand-primary)] text-white rounded-md py-2 text-sm font-medium hover:bg-[var(--brand-primary-dark)] disabled:opacity-60"
            >
              {loading ? "Sending..." : "Send reset code"}
            </button>
          </form>
        )}

        <div className="text-center mt-4">
          <Link to="/login" className="text-sm text-[var(--brand-primary)] hover:underline">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
