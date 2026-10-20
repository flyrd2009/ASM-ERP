import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getErrorMessage, formatLockedUntil } from "../utils/apiError";
import PasswordInput from "../components/PasswordInput";

export default function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(typeof navigator !== "undefined" && !navigator.onLine);

  const { login, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Guards against a double-submit firing two requests: the button is
  // disabled while loading, but a very fast double-click/double-Enter can
  // still slip a second request in before the first re-render lands — this
  // is a synchronous guard that closes that gap.
  const submittingRef = useRef(false);
  // Cancels the in-flight request if the component unmounts (route change)
  // or a fresh submit starts while a previous one is still pending, so a
  // slow, stale response can never land after a newer one already resolved.
  const abortRef = useRef(null);

  // Already logged in and lands on /login anyway (e.g. typed the URL
  // directly, or clicked a stale bookmark) — send them straight through
  // instead of showing a confusing "log in again" screen.
  useEffect(() => {
    if (!authLoading && user) navigate("/dashboard", { replace: true });
  }, [authLoading, user, navigate]);

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

  function handleCapsLock(e) {
    if (typeof e.getModifierState === "function") {
      setCapsLockOn(e.getModifierState("CapsLock"));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (submittingRef.current) return;

    const trimmedIdentifier = identifier.trim();
    if (!trimmedIdentifier || !password) {
      setError("Enter both your email/ID and password.");
      return;
    }

    submittingRef.current = true;
    setError("");
    setLoading(true);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const data = await login(trimmedIdentifier, password, { signal: controller.signal });

      if (data.forcePasswordReset) {
        navigate("/reset-password", { state: { userId: data.userId } });
        return;
      }
      navigate("/dashboard");
    } catch (err) {
      const res = err?.response?.data;
      if (res?.lockedUntil) {
        setError(`Account locked until ${formatLockedUntil(res.lockedUntil)}. Contact your administrator.`);
      } else if (res?.attemptsRemaining !== undefined) {
        const n = res.attemptsRemaining;
        setError(`Invalid credentials. ${n} attempt${n === 1 ? "" : "s"} remaining before lockout.`);
      } else {
        const msg = getErrorMessage(err, "Login failed. Please try again.");
        if (msg) setError(msg); // null means the request was intentionally cancelled — nothing to show
      }
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-sm bg-white rounded-lg shadow-md p-8">
        <div className="flex flex-col items-center text-center mb-6">
          <img src="/logo.png" alt="ASM Polytechnic, Mathura" className="h-16 w-auto mb-3" />
          <p className="text-sm text-slate-500">ERP Portal Login</p>
        </div>

        {offline && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mb-4">
            You're offline. Reconnect before signing in.
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="identifier" className="block text-sm font-medium text-slate-700">
              Email, Enrollment No., or Employee ID
            </label>
            <input
              id="identifier"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="you@example.com or your ID"
              maxLength={100}
              className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
              required
              autoComplete="username"
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700">Password</label>
            <PasswordInput
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyUp={handleCapsLock}
              onKeyDown={handleCapsLock}
              maxLength={200}
              className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
              required
              autoComplete="current-password"
            />
            {capsLockOn && (
              <p className="text-xs text-amber-600 mt-1">Caps Lock is on.</p>
            )}
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || offline}
            className="w-full bg-[var(--brand-primary)] text-white rounded-md py-2 text-sm font-medium hover:bg-[var(--brand-primary-dark)] disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="text-center mt-4 space-y-1">
          <p>
            <Link to="/forgot-password" className="text-sm text-[var(--brand-primary)] hover:underline">
              Forgot password?
            </Link>
          </p>
          <p>
            <Link to="/login-otp" className="text-sm text-[var(--brand-primary)] hover:underline">
              Log in with a code instead
            </Link>
          </p>
        </div>
      </div>

      <CollegeContactFooter />
    </div>
  );
}

function CollegeContactFooter() {
  return (
    <div className="w-full max-w-sm mt-6 text-center text-xs text-slate-500 space-y-1">
      <p>ASM Polytechnic, Near New Bus Stand, Mathura (U.P.) 281004</p>
      <p>
        <a href="tel:+917455087194" className="hover:underline">7455087194</a>
        {" · "}
        <a href="tel:+919045490473" className="hover:underline">9045490473</a>
      </p>
      <p>
        <a href="mailto:info.asmp@bsacet.org" className="hover:underline">info.asmp@bsacet.org</a>
        {" · "}
        <a href="https://www.asmp.ac.in" target="_blank" rel="noreferrer" className="hover:underline">www.asmp.ac.in</a>
      </p>
    </div>
  );
}
