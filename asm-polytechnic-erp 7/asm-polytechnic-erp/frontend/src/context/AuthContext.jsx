import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import api, {
  setAccessToken,
  setSessionTimeoutMinutes,
  getSessionTimeoutMinutes,
  registerSessionExpiredHandler,
} from "../api/client";

const AuthContext = createContext(null);

const ACTIVITY_EVENTS = ["mousemove", "keydown", "click", "scroll", "touchstart"];
const WARNING_BEFORE_MS = 60 * 1000; // show "still there?" modal 60s before timeout

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);

  const idleTimer = useRef(null);
  const warningTimer = useRef(null);
  const lastActivity = useRef(Date.now());

  const clearTimers = () => {
    clearTimeout(idleTimer.current);
    clearTimeout(warningTimer.current);
  };

  const forceLogout = useCallback((message) => {
    clearTimers();
    setAccessToken(null);
    setUser(null);
    setShowTimeoutWarning(false);
    if (message) sessionStorage.setItem("erp_logout_reason", message);
    window.location.href = "/login";
  }, []);

  // Resets the idle countdown. Called on every tracked user interaction,
  // and again whenever the access token refreshes with a possibly-updated
  // per-role timeout (admin can change this live in Settings -> Security).
  const resetIdleTimer = useCallback(() => {
    lastActivity.current = Date.now();
    clearTimers();
    setShowTimeoutWarning(false);

    const timeoutMs = getSessionTimeoutMinutes() * 60 * 1000;
    warningTimer.current = setTimeout(() => setShowTimeoutWarning(true), timeoutMs - WARNING_BEFORE_MS);
    idleTimer.current = setTimeout(() => forceLogout("Session expired due to inactivity."), timeoutMs);
  }, [forceLogout]);

  useEffect(() => {
    registerSessionExpiredHandler(() => forceLogout("Session expired. Please log in again."));
  }, [forceLogout]);

  useEffect(() => {
    if (!user) return;
    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, resetIdleTimer));
    resetIdleTimer();
    return () => {
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, resetIdleTimer));
      clearTimers();
    };
  }, [user, resetIdleTimer]);

  // Try to restore session on app load via the httpOnly refresh cookie
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.post("/auth/refresh");
        setAccessToken(data.accessToken);
        setSessionTimeoutMinutes(data.sessionTimeoutMinutes);
        setUser(data.user || null);
      } catch {
        // no valid session — that's fine, user just needs to log in
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function login(identifier, password, options = {}) {
    const { data } = await api.post("/auth/login", { identifier, password }, { signal: options.signal });
    if (data.forcePasswordReset) return data; // caller handles next step
    setAccessToken(data.accessToken);
    setSessionTimeoutMinutes(data.sessionTimeoutMinutes);
    setUser(data.user);
    return data;
  }

  // Passwordless login: request an OTP via email or mobile, then verify it.
  async function requestOtpLogin(identifier, channel, options = {}) {
    const { data } = await api.post("/auth/otp-login/request", { identifier, channel }, { signal: options.signal });
    return data;
  }

  async function verifyOtpLogin(userId, otp, options = {}) {
    const { data } = await api.post("/auth/otp-login/verify", { userId, otp }, { signal: options.signal });
    if (data.forcePasswordReset) return data; // caller handles next step
    setAccessToken(data.accessToken);
    setSessionTimeoutMinutes(data.sessionTimeoutMinutes);
    setUser(data.user);
    return data;
  }

  async function logout() {
    await api.post("/auth/logout").catch(() => {});
    forceLogout(null);
  }

  async function logoutAllDevices() {
    await api.post("/auth/logout-all").catch(() => {});
    forceLogout(null);
  }

  function stayLoggedIn() {
    resetIdleTimer();
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, login, requestOtpLogin, verifyOtpLogin, logout, logoutAllDevices, showTimeoutWarning, stayLoggedIn }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
