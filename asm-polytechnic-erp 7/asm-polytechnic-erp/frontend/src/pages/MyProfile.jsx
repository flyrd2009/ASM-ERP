import { useEffect, useState } from "react";
import api from "../api/client";
import { getErrorMessage } from "../utils/apiError";
import { useAuth } from "../context/AuthContext";
import Avatar from "../components/Avatar";

const CERT_TYPES = [
  { value: "bonafide", label: "Bonafide Certificate" },
  { value: "transfer_certificate", label: "Transfer Certificate" },
  { value: "migration_certificate", label: "Migration Certificate" },
  { value: "provisional_marksheet", label: "Provisional Marksheet" },
];

export default function MyProfile() {
  const { user } = useAuth();
  const [student, setStudent] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get("/students/me");
      setStudent(data.student);
      setError("");
    } catch (err) {
      setError(getErrorMessage(err, "Could not load your profile.") || "Could not load your profile.");
    } finally {
      setLoading(false);
    }
  }

  async function requestCertificate(certType, reason) {
    try {
      await api.post("/students/me/certificate-requests", { certType, reason });
      setMsg("Certificate request submitted.");
      load();
    } catch (err) {
      setMsg(getErrorMessage(err, "Request failed.") || "Request failed.");
    }
  }

  if (loading) return <div className="p-6 text-slate-400">Loading...</div>;
  if (error) return <div className="p-6 text-red-600 text-sm">{error}</div>;

  return (
    <div className="max-w-3xl p-6 space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-4 mb-3">
          <Avatar photoUrl={user?.photoUrl} name={user?.fullName} size="w-16 h-16" text="text-xl" />
          <h1 className="text-xl font-bold text-slate-800">My Profile</h1>
        </div>
        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-slate-500">Enrollment No.</dt>
          <dd className="text-slate-800">{student.enrollmentNo}</dd>
          <dt className="text-slate-500">Branch</dt>
          <dd className="text-slate-800">{student.branch}</dd>
          <dt className="text-slate-500">Batch Year</dt>
          <dd className="text-slate-800">{student.batchYear}</dd>
          <dt className="text-slate-500">Current Semester</dt>
          <dd className="text-slate-800">{student.currentSemester}</dd>
          <dt className="text-slate-500">Status</dt>
          <dd className="text-slate-800 capitalize">{student.admissionStatus?.replace("_", " ")}</dd>
        </dl>
      </div>

      {msg && <p className="text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-md px-3 py-2">{msg}</p>}

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="font-semibold text-slate-800 mb-3">Documents</h2>
        {student.StudentDocuments?.length ? (
          <ul className="text-sm space-y-1">
            {student.StudentDocuments.map((d) => (
              <li key={d.id} className="flex justify-between border-b border-slate-100 py-1">
                <span>{d.fileName} <span className="text-slate-400">({d.docType.replace(/_/g, " ")})</span></span>
                <span className={d.verified ? "text-green-600" : "text-amber-600"}>{d.verified ? "Verified" : "Pending"}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-400">No documents on file yet.</p>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="font-semibold text-slate-800 mb-3">Certificate Requests</h2>
        <CertificateRequestForm onSubmit={requestCertificate} />
        {student.CertificateRequests?.length > 0 && (
          <ul className="text-sm space-y-1 mt-4">
            {student.CertificateRequests.map((r) => (
              <li key={r.id} className="flex justify-between border-b border-slate-100 py-1">
                <span>{CERT_TYPES.find((c) => c.value === r.certType)?.label || r.certType}</span>
                <span className="capitalize text-slate-500">{r.status.replace(/_/g, " ")}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function CertificateRequestForm({ onSubmit }) {
  const [certType, setCertType] = useState(CERT_TYPES[0].value);
  const [reason, setReason] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit(certType, reason);
    setReason("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 flex-wrap items-center">
      <select value={certType} onChange={(e) => setCertType(e.target.value)}
        className="border border-slate-300 rounded-md px-2 py-1.5 text-sm">
        {CERT_TYPES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
      </select>
      <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (optional)"
        className="border border-slate-300 rounded-md px-2 py-1.5 text-sm flex-1 min-w-[160px]" />
      <button className="bg-[var(--brand-primary)] text-white text-sm rounded-md px-3 py-1.5 hover:bg-[var(--brand-primary-dark)]">Request</button>
    </form>
  );
}
