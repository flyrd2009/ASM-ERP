import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getErrorMessage } from "../utils/apiError";

const RESEND_COOLDOWN_SECONDS = 30;

export default function OtpLogin() {
  const [channel, setChannel] = useState("email");
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [stage, setStage] = useState("request"); // "request" | "verify"
  const [userId, setUserId] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(typeof navigator !== "undefined" && !navigator.onLine);
  const [cooldown, setCooldown] = useState(0);

  const { requestOtpLogin, verifyOtpLogin } = useAuth();
  const navigate = useNavigate();
  const submittingRef = useRef(false);
  const abortRef = useRef(null);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function handleRequest(e) {
    e.preventDefault();
    if (submittingRef.current || cooldown > 0) return;

    const trimmed = identifier.trim();
    if (!trimmed) {
      setError(channel === "mobile" ? "Enter your mobile number." : "Enter your email.");
      return;
    }

    submittingRef.current = true;
    setError("");
    setLoading(true);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const data = await requestOtpLogin(trimmed, channel, { signal: controller.signal });
      setCooldown(RESEND_COOLDOWN_SECONDS);
      if (data.userId) {
        setUserId(data.userId);
        setStage("verify");
      } else {
        // Still show the generic success message even if no account was
        // found — never confirm/deny which identifiers exist.
        setError("");
        setStage("verify");
        setUserId(null);
      }
    } catch (err) {
      const msg = getErrorMessage(err);
      if (msg) setError(msg);
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  }

  async function handleVerify(e) {
    e.preventDefault();
    if (submittingRef.current) return;
    if (!userId) {
      setError("If that account exists, a code was sent — but this session can't verify one. Try requesting again.");
      return;
    }

    const code = otp.trim();
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code.");
      return;
    }

    submittingRef.current = true;
    setError("");
    setLoading(true);
    try {
      const data = await verifyOtpLogin(userId, code);
      if (data.forcePasswordReset) {
        navigate("/reset-password", { state: { userId: data.userId } });
        return;
      }
      navigate("/dashboard");
    } catch (err) {
      const msg = getErrorMessage(err, "Invalid or expired code.");
      if (msg) setError(msg);
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-lg shadow-md p-8">
        <div className="flex flex-col items-center text-center mb-6">
          <img src="/logo.png" alt="ASM Polytechnic, Mathura" className="h-14 w-auto mb-3" />
          <h1 className="text-lg font-bold text-slate-800">Log in with a code</h1>
        </div>

        {offline && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mb-4">
            You're offline. Reconnect to continue.
          </p>
        )}

        {stage === "request" ? (
          <form onSubmit={handleRequest} className="space-y-4" noValidate>
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
              type={channel === "mobile" ? "tel" : "email"}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={channel === "mobile" ? "Mobile number (WhatsApp)" : "Email address"}
              maxLength={100}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
              required
              autoFocus
            />

            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

            <button
              disabled={loading || offline}
              className="w-full bg-[var(--brand-primary)] text-white rounded-md py-2 text-sm font-medium hover:bg-[var(--brand-primary-dark)] disabled:opacity-60"
            >
              {loading ? "Sending..." : "Send code"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="space-y-4" noValidate>
            <p className="text-sm text-slate-500">
              If that {channel === "mobile" ? "mobile number" : "email"} is registered, a 6-digit code was sent{channel === "mobile" ? " on WhatsApp" : ""}. Enter it below.
            </p>
            <input
              type="text"
              inputMode="numeric"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              placeholder="6-digit code"
              maxLength={6}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
              required
              autoFocus
            />

            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

            <button
              disabled={loading || offline}
              className="w-full bg-[var(--brand-primary)] text-white rounded-md py-2 text-sm font-medium hover:bg-[var(--brand-primary-dark)] disabled:opacity-60"
            >
              {loading ? "Verifying..." : "Verify & sign in"}
            </button>

            <button
              type="button"
              onClick={handleRequest}
              disabled={cooldown > 0 || loading || offline}
              className="w-full text-xs text-[var(--brand-primary)] hover:underline disabled:text-slate-400 disabled:no-underline"
            >
              {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
            </button>

            <button
              type="button"
              onClick={() => { setStage("request"); setOtp(""); setError(""); }}
              className="w-full text-xs text-slate-500 hover:underline"
            >
              Use a different email/mobile
            </button>
          </form>
        )}

        <div className="text-center mt-4">
          <Link to="/login" className="text-sm text-[var(--brand-primary)] hover:underline">
            Log in with password instead
          </Link>
        </div>
      </div>
    </div>
  );
}
