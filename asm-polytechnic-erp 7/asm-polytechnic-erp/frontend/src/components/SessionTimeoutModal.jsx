import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function SessionTimeoutModal() {
  const { showTimeoutWarning, stayLoggedIn, logout } = useAuth();
  const [secondsLeft, setSecondsLeft] = useState(60);

  useEffect(() => {
    if (!showTimeoutWarning) {
      setSecondsLeft(60);
      return;
    }
    const interval = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [showTimeoutWarning]);

  if (!showTimeoutWarning) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
        <h2 className="text-lg font-semibold text-slate-800">Are you still there?</h2>
        <p className="text-sm text-slate-600 mt-2">
          You'll be logged out in <span className="font-semibold">{secondsLeft}s</span> due to inactivity.
        </p>
        <div className="flex gap-3 mt-5">
          <button
            onClick={stayLoggedIn}
            className="flex-1 bg-[var(--brand-primary)] text-white rounded-md py-2 text-sm font-medium hover:bg-[var(--brand-primary-dark)]"
          >
            Stay logged in
          </button>
          <button
            onClick={logout}
            className="flex-1 border border-slate-300 rounded-md py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Log out now
          </button>
        </div>
      </div>
    </div>
  );
}
