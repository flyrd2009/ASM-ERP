import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// In-memory only — never localStorage. Access tokens are short-lived (15m);
// the refresh token lives in an httpOnly cookie the browser handles for us.
let accessToken = null;
let sessionTimeoutMinutes = 20;
let onSessionExpired = () => {};

export function setAccessToken(token) {
  accessToken = token;
}
export function setSessionTimeoutMinutes(mins) {
  sessionTimeoutMinutes = mins;
}
export function getSessionTimeoutMinutes() {
  return sessionTimeoutMinutes;
}
export function registerSessionExpiredHandler(fn) {
  onSessionExpired = fn;
}

const api = axios.create({ baseURL: BASE_URL, withCredentials: true, timeout: 15000 });

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// On a 401 from a session-protected endpoint, try refreshing once (covers:
// access token expired naturally). If refresh also fails, force logout.
//
// Public auth endpoints (login, OTP verification, forgot/reset password)
// also return 401 for perfectly ordinary reasons — wrong password, wrong
// code, expired code — and the caller (that page's own try/catch) already
// handles showing the right message. Treating those as "session expired"
// used to trigger a global forced logout/redirect on a simple typo, which
// looked like the whole app randomly resetting. Those paths are excluded here.
let refreshing = null;
const PUBLIC_AUTH_PATHS = [
  "/auth/login",
  "/auth/otp-login/request",
  "/auth/otp-login/verify",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/refresh",
];

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    const isPublicAuthCall = PUBLIC_AUTH_PATHS.some((p) => original?.url?.includes(p));

    if (err.response?.status === 401 && !original._retry && !isPublicAuthCall) {
      original._retry = true;
      try {
        if (!refreshing) {
          refreshing = api.post("/auth/refresh").finally(() => (refreshing = null));
        }
        const { data } = await refreshing;
        setAccessToken(data.accessToken);
        setSessionTimeoutMinutes(data.sessionTimeoutMinutes);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        setAccessToken(null);
        onSessionExpired();
      }
    }

    return Promise.reject(err);
  }
);

export default api;
