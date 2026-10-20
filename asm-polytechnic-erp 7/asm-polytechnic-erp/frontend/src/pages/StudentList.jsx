import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import { getErrorMessage } from "../utils/apiError";

export default function StudentList() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [showEnroll, setShowEnroll] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/students", { params: search ? { search } : {} });
      setStudents(data.students);
      setError("");
    } catch (err) {
      setError(getErrorMessage(err, "Could not load students.") || "Could not load students.");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold text-slate-800">Students</h1>
        <button onClick={() => setShowEnroll(true)} className="bg-[var(--brand-primary)] text-white text-sm rounded-md px-4 py-2 hover:bg-[var(--brand-primary-dark)]">
          + Enroll Student Profile
        </button>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name or login ID..."
        className="border border-slate-300 rounded-md px-3 py-2 text-sm w-full mb-4"
      />

      {msg && <p className="text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-md px-3 py-2 mb-4">{msg}</p>}
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-left">
            <tr>
              <th className="px-4 py-2">Enrollment No.</th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Branch</th>
              <th className="px-4 py-2">Sem</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">Loading...</td></tr>
            ) : students.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">No students found.</td></tr>
            ) : (
              students.map((s) => (
                <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2">
                    <Link to={`/students/${s.id}`} className="text-[var(--brand-primary)] hover:underline">{s.enrollmentNo}</Link>
                  </td>
                  <td className="px-4 py-2">{s.User?.fullName}</td>
                  <td className="px-4 py-2">{s.branch}</td>
                  <td className="px-4 py-2">{s.currentSemester}</td>
                  <td className="px-4 py-2 capitalize">{s.admissionStatus?.replace("_", " ")}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showEnroll && (
        <EnrollModal
          onClose={() => setShowEnroll(false)}
          onDone={(m) => { setMsg(m); setShowEnroll(false); load(); }}
        />
      )}
    </div>
  );
}

const BRANCHES = ["Computer Engineering", "Mechanical Engineering", "Civil Engineering", "Electrical Engineering", "Electronics Engineering"];

function EnrollModal({ onClose, onDone }) {
  const [form, setForm] = useState({ userId: "", enrollmentNo: "", branch: BRANCHES[0], batchYear: new Date().getFullYear(), currentSemester: 1 });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/students", form);
      onDone(data.message);
    } catch (err) {
      setError(getErrorMessage(err, "Could not create profile.") || "Could not create profile.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
        <h2 className="text-lg font-semibold text-slate-800 mb-1">Enroll Student Profile</h2>
        <p className="text-xs text-slate-500 mb-4">
          This attaches academic details to an existing student account.
          Create the account first under User Management if it doesn't exist yet.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input required placeholder="User ID (from User Management)" value={form.userId}
            onChange={(e) => setForm({ ...form, userId: e.target.value })}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          <input required placeholder="Enrollment No." value={form.enrollmentNo}
            onChange={(e) => setForm({ ...form, enrollmentNo: e.target.value })}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          <select value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm">
            {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
          <div className="flex gap-2">
            <input required type="number" placeholder="Batch year" value={form.batchYear}
              onChange={(e) => setForm({ ...form, batchYear: Number(e.target.value) })}
              className="w-1/2 border border-slate-300 rounded-md px-3 py-2 text-sm" />
            <input required type="number" min="1" max="8" placeholder="Semester" value={form.currentSemester}
              onChange={(e) => setForm({ ...form, currentSemester: Number(e.target.value) })}
              className="w-1/2 border border-slate-300 rounded-md px-3 py-2 text-sm" />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={loading}
              className="flex-1 bg-[var(--brand-primary)] text-white rounded-md py-2 text-sm font-medium hover:bg-[var(--brand-primary-dark)] disabled:opacity-60">
              {loading ? "Creating..." : "Create Profile"}
            </button>
            <button type="button" onClick={onClose}
              className="flex-1 border border-slate-300 rounded-md py-2 text-sm text-slate-700 hover:bg-slate-50">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
