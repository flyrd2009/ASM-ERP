import { useState, useEffect, useCallback } from "react";
import api from "../api/client";
import { getErrorMessage } from "../utils/apiError";

const BRANCHES = ["Computer Engineering", "Mechanical Engineering", "Civil Engineering", "Electrical Engineering", "Electronics Engineering"];
const STATUSES = [
  { value: "present", label: "P", color: "bg-green-100 text-green-700 border-green-300" },
  { value: "absent", label: "A", color: "bg-red-100 text-red-700 border-red-300" },
  { value: "leave", label: "L", color: "bg-amber-100 text-amber-700 border-amber-300" },
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function AttendanceMark() {
  const [branch, setBranch] = useState(BRANCHES[0]);
  const [semester, setSemester] = useState(1);
  const [date, setDate] = useState(todayISO());
  const [roster, setRoster] = useState([]);
  const [marks, setMarks] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setMsg("");
    try {
      const { data } = await api.get("/attendance/class", { params: { branch, semester, date } });
      setRoster(data.roster);
      setMarks(Object.fromEntries(data.roster.map((s) => [s.studentId, s.status || "present"])));
      setError("");
    } catch (err) {
      setError(getErrorMessage(err, "Could not load class roster.") || "Could not load class roster.");
    } finally {
      setLoading(false);
    }
  }, [branch, semester, date]);

  useEffect(() => {
    load();
  }, [load]);

  function setMark(studentId, status) {
    setMarks((m) => ({ ...m, [studentId]: status }));
  }

  function markAll(status) {
    setMarks(Object.fromEntries(roster.map((s) => [s.studentId, status])));
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setMsg("");
    try {
      const records = roster.map((s) => ({ studentId: s.studentId, status: marks[s.studentId] || "present" }));
      const { data } = await api.post("/attendance/mark", { date, records });
      setMsg(data.message);
    } catch (err) {
      setError(getErrorMessage(err, "Could not save attendance.") || "Could not save attendance.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl p-6">
      <h1 className="text-xl font-bold text-slate-800 mb-4">Mark Attendance</h1>

      <div className="flex flex-wrap gap-3 mb-4">
        <select value={branch} onChange={(e) => setBranch(e.target.value)}
          className="border border-slate-300 rounded-md px-3 py-2 text-sm">
          {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
        <select value={semester} onChange={(e) => setSemester(Number(e.target.value))}
          className="border border-slate-300 rounded-md px-3 py-2 text-sm">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => <option key={s} value={s}>Semester {s}</option>)}
        </select>
        <input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)}
          className="border border-slate-300 rounded-md px-3 py-2 text-sm" />
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      {msg && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2 mb-4">{msg}</p>}

      {!loading && roster.length > 0 && (
        <div className="flex gap-2 mb-3 text-xs">
          <span className="text-slate-500">Mark all:</span>
          {STATUSES.map((s) => (
            <button key={s.value} onClick={() => markAll(s.value)} className={`px-2 py-0.5 rounded border ${s.color}`}>
              {s.value}
            </button>
          ))}
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-left">
            <tr>
              <th className="px-4 py-2">Enrollment No.</th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} className="px-4 py-6 text-center text-slate-400">Loading...</td></tr>
            ) : roster.length === 0 ? (
              <tr><td colSpan={3} className="px-4 py-6 text-center text-slate-400">No students found for this branch/semester.</td></tr>
            ) : (
              roster.map((s) => (
                <tr key={s.studentId} className="border-t border-slate-100">
                  <td className="px-4 py-2">{s.enrollmentNo}</td>
                  <td className="px-4 py-2">{s.fullName}</td>
                  <td className="px-4 py-2">
                    <div className="flex gap-1.5">
                      {STATUSES.map((st) => (
                        <button
                          key={st.value}
                          onClick={() => setMark(s.studentId, st.value)}
                          className={`w-7 h-7 rounded-full text-xs font-semibold border ${
                            marks[s.studentId] === st.value ? st.color : "bg-white text-slate-400 border-slate-200"
                          }`}
                        >
                          {st.label}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {roster.length > 0 && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-4 bg-[var(--brand-primary)] text-white text-sm rounded-md px-4 py-2 hover:bg-[var(--brand-primary-dark)] disabled:opacity-60"
        >
          {saving ? "Saving..." : `Save Attendance (${roster.length} students)`}
        </button>
      )}
    </div>
  );
}
