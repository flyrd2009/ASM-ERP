import { useEffect, useState, useRef } from "react";
import api from "../api/client";

const VALID = {
  email: (v) => /^\S+@\S+\.\S+$/.test(v),
  loginId: (v) => v.length >= 3 && /^[a-zA-Z0-9._-]+$/.test(v),
  phone: (v) => v.replace(/\D/g, "").length >= 7,
  enrollmentNo: (v) => v.length >= 1,
};
const LABEL = { email: "email", loginId: "Login ID", phone: "mobile number", enrollmentNo: "enrollment number" };

// Live "already registered?" check shown under a form field. Waits for
// typing to pause, skips values that are obviously incomplete, and skips
// the value an existing record already has (so editing doesn't flag itself).
// `onResult(true|false|null)` lets the parent block Submit on a duplicate.
export default function AvailabilityHint({ field, value, original, excludeUserId, excludeStudentId, onResult }) {
  const [state, setState] = useState("idle"); // idle | checking | available | taken
  const counter = useRef(0);

  useEffect(() => {
    const v = (value || "").trim();
    const isOriginal = original && v.toLowerCase() === String(original).trim().toLowerCase();

    if (!v || isOriginal || !VALID[field](v)) {
      setState("idle");
      onResult?.(null);
      return;
    }

    const id = ++counter.current;
    setState("checking");
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get("/availability", { params: { field, value: v, excludeUserId, excludeStudentId } });
        if (id !== counter.current) return; // a newer keystroke superseded this check
        setState(data.available ? "available" : "taken");
        onResult?.(data.available);
      } catch {
        if (id === counter.current) {
          setState("idle"); // a failed check shouldn't nag; the server still validates on submit
          onResult?.(null);
        }
      }
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field, value, original, excludeUserId, excludeStudentId]);

  if (state === "checking") return <p className="text-xs text-slate-400 mt-1">Checking...</p>;
  if (state === "available") return <p className="text-xs text-green-600 mt-1">✓ This {LABEL[field]} is available.</p>;
  if (state === "taken") return <p className="text-xs text-red-600 mt-1">✗ This {LABEL[field]} is already registered.</p>;
  return null;
}
