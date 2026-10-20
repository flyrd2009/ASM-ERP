import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";
import { getErrorMessage } from "../utils/apiError";
import Avatar from "../components/Avatar";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning!";
  if (h < 17) return "Good Afternoon!";
  return "Good Evening!";
}

export default function Dashboard() {
  const { user } = useAuth();

  if (user?.role === "student") return <StudentHome />;
  return <GenericHome />;
}

function GenericHome() {
  const { user } = useAuth();
  return (
    <div className="p-6">
      <div className="max-w-2xl bg-white rounded-lg shadow p-6">
        <h1 className="text-xl font-bold text-slate-800">Welcome, {user?.fullName}</h1>
        <p className="text-sm text-slate-500 mt-1">
          Role: <span className="capitalize">{user?.role}</span> · Login ID: {user?.loginId}
        </p>
        <p className="text-sm text-slate-400 mt-6">
          Use the sidebar to reach the modules available to your role.
        </p>
      </div>
    </div>
  );
}

function StudentHome() {
  const { user } = useAuth();
  const [student, setStudent] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const now = new Date();
      try {
        const [profileRes, attendanceRes] = await Promise.all([
          api.get("/students/me"),
          api.get("/attendance/me", { params: { year: now.getFullYear(), month: now.getMonth() + 1 } }),
        ]);
        setStudent(profileRes.data.student);
        setAttendance(attendanceRes.data.stats);
      } catch (err) {
        setError(getErrorMessage(err, "Could not load your dashboard.") || "Could not load your dashboard.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="p-6 text-slate-400">Loading...</div>;

  const pendingRequests = student?.CertificateRequests?.filter((r) => r.status === "pending") || [];

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Greeting + profile strip */}
      <div className="bg-white rounded-lg shadow p-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <h1 className="text-lg font-bold" style={{ color: "var(--brand-primary)" }}>{greeting()}</h1>
          <p className="text-sm text-slate-500 mt-1">You're doing great — keep up the hard work.</p>
        </div>
        <div className="flex items-center gap-3">
          <Avatar photoUrl={user?.photoUrl} name={user?.fullName} size="w-12 h-12" text="text-base" />
          <div>
            <p className="font-semibold text-slate-800">{user?.fullName}</p>
            <p className="text-xs text-slate-500">
              {student?.enrollmentNo} · {student?.branch} · Sem {student?.currentSemester}
            </p>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Attendance summary */}
        <Link to="/my-attendance" className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
          <p className="text-xs text-slate-500">This Month's Attendance</p>
          {attendance ? (
            <>
              <p className="text-2xl font-bold text-green-600">{attendance.presentPercentage}%</p>
              <p className="text-xs text-slate-400">{attendance.present} of {attendance.schoolDays} school days</p>
            </>
          ) : (
            <p className="text-sm text-slate-400 mt-2">No data yet</p>
          )}
        </Link>

        {/* Admission status */}
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs text-slate-500">Admission Status</p>
          <p className="text-lg font-semibold text-slate-800 capitalize mt-1">
            {student?.admissionStatus?.replace("_", " ") || "—"}
          </p>
          <p className="text-xs text-slate-400">Batch {student?.batchYear}</p>
        </div>

        {/* Certificate requests */}
        <Link to="/my-profile" className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
          <p className="text-xs text-slate-500">Pending Certificate Requests</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{pendingRequests.length}</p>
          <p className="text-xs text-slate-400">View or request in My Profile</p>
        </Link>
      </div>

      {/* Documents at a glance */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-800">Documents</h2>
          <Link to="/my-profile" className="text-xs" style={{ color: "var(--brand-primary)" }}>View all</Link>
        </div>
        {student?.StudentDocuments?.length ? (
          <ul className="text-sm space-y-1">
            {student.StudentDocuments.slice(0, 3).map((d) => (
              <li key={d.id} className="flex justify-between border-b border-slate-100 py-1">
                <span>{d.fileName}</span>
                <span className={d.verified ? "text-green-600 text-xs" : "text-amber-600 text-xs"}>
                  {d.verified ? "Verified" : "Pending"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-400">No documents on file yet.</p>
        )}
      </div>
    </div>
  );
}
