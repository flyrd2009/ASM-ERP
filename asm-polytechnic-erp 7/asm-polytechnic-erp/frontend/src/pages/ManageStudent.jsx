import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { getErrorMessage } from "../utils/apiError";
import Avatar from "../components/Avatar";
import PhotoUploader from "../components/PhotoUploader";
import AvailabilityHint from "../components/AvailabilityHint";

const BRANCHES = ["Computer Engineering", "Mechanical Engineering", "Civil Engineering", "Electrical Engineering", "Electronics Engineering"];
const STATUSES = ["active", "on_leave", "graduated", "dropped_out"];
const DOC_TYPES = ["10th_certificate", "12th_certificate", "transfer_certificate", "id_proof", "photo", "other"];

// The one-stop page for everything about a single student: their login
// account (name/email/phone/Login ID/password/lock status), their academic
// profile (enrollment no./branch/batch/semester/status/photo), and their
// documents and certificate requests — previously spread across two
// separate pages (User Management + the old Student Detail page).
export default function ManageStudent() {
  const { studentId } = useParams();
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  const [accountForm, setAccountForm] = useState(null);
  const [academicForm, setAcademicForm] = useState(null);
  const [taken, setTaken] = useState({});
  const mark = (field) => (available) => setTaken((t) => ({ ...t, [field]: available === false }));
  const [savingAccount, setSavingAccount] = useState(false);
  const [savingAcademic, setSavingAcademic] = useState(false);

  const [newDoc, setNewDoc] = useState({ docType: DOC_TYPES[0], fileName: "", fileUrl: "" });
  const [addingDoc, setAddingDoc] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/students/${studentId}`);
      setStudent(data.student);
      setAccountForm({
        fullName: data.student.User?.fullName || "",
        loginId: data.student.User?.loginId || "",
        email: data.student.User?.email || "",
        phone: data.student.User?.phone || "",
      });
      setAcademicForm({
        enrollmentNo: data.student.enrollmentNo,
        branch: data.student.branch,
        batchYear: data.student.batchYear,
        currentSemester: data.student.currentSemester,
        admissionStatus: data.student.admissionStatus,
      });
      setError("");
    } catch (err) {
      setError(getErrorMessage(err, "Could not load student.") || "Could not load student.");
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveAccount() {
    setSavingAccount(true);
    setMsg("");
    try {
      const { data } = await api.patch(`/admin/users/${student.User.id}`, accountForm);
      setMsg(data.message);
      load();
    } catch (err) {
      setMsg(getErrorMessage(err, "Could not save account details.") || "Could not save account details.");
    } finally {
      setSavingAccount(false);
    }
  }

  async function saveAcademic() {
    setSavingAcademic(true);
    setMsg("");
    try {
      await api.patch(`/students/${studentId}`, academicForm);
      setMsg("Academic profile updated.");
      load();
    } catch (err) {
      setMsg(getErrorMessage(err, "Could not save academic profile.") || "Could not save academic profile.");
    } finally {
      setSavingAcademic(false);
    }
  }

  async function handleResetPassword() {
    if (!confirm(`Force a password reset for ${student.User.fullName} on next login?`)) return;
    try {
      const { data } = await api.post(`/admin/users/${student.User.id}/reset-password`);
      setMsg(`${data.message} Temp password: ${data.tempPassword}`);
      load();
    } catch (err) {
      setMsg(getErrorMessage(err, "Action failed.") || "Action failed.");
    }
  }

  async function handleUnlock() {
    if (!confirm(`Unlock ${student.User.fullName}'s account?`)) return;
    try {
      const { data } = await api.post(`/admin/users/${student.User.id}/unlock`);
      setMsg(`${data.message} Temp password: ${data.tempPassword}`);
      load();
    } catch (err) {
      setMsg(getErrorMessage(err, "Action failed.") || "Action failed.");
    }
  }

  async function handleStatus(status) {
    const verb = status === "disabled" ? "disable" : "enable";
    if (!confirm(`${verb === "disable" ? "Disable" : "Enable"} this account?`)) return;
    try {
      const { data } = await api.patch(`/admin/users/${student.User.id}/status`, { status });
      setMsg(data.message);
      load();
    } catch (err) {
      setMsg(getErrorMessage(err, "Action failed.") || "Action failed.");
    }
  }

  async function handleAddDocument(e) {
    e.preventDefault();
    if (!newDoc.fileName) return;
    setAddingDoc(true);
    try {
      await api.post(`/students/${studentId}/documents`, newDoc);
      setNewDoc({ docType: DOC_TYPES[0], fileName: "", fileUrl: "" });
      setMsg("Document added.");
      load();
    } catch (err) {
      setMsg(getErrorMessage(err, "Could not add document.") || "Could not add document.");
    } finally {
      setAddingDoc(false);
    }
  }

  async function verifyDoc(docId, verified) {
    try {
      await api.patch(`/students/documents/${docId}/verify`, { verified });
      load();
    } catch (err) {
      setMsg(getErrorMessage(err, "Update failed.") || "Update failed.");
    }
  }

  async function updateCertRequest(requestId, status) {
    try {
      await api.patch(`/students/certificate-requests/${requestId}`, { status });
      setMsg(`Request marked ${status.replace("_", " ")}.`);
      load();
    } catch (err) {
      setMsg(getErrorMessage(err, "Update failed.") || "Update failed.");
    }
  }

  if (loading) return <div className="p-6 text-slate-400">Loading...</div>;
  if (error) return <div className="p-6 text-red-600 text-sm">{error}</div>;

  const isLocked = student.User?.status === "locked";
  const isDisabled = student.User?.status === "disabled";

  return (
    <div className="max-w-3xl p-6 space-y-6">
      <Link to="/students" className="text-sm text-[var(--brand-primary)] hover:underline">&larr; Back to students</Link>

      {/* Photo + identity header */}
      <div className="bg-white rounded-lg shadow p-6 flex items-center gap-4">
        <Avatar photoUrl={student.User?.photoUrl} name={accountForm.fullName} size="w-16 h-16" text="text-xl" />
        <div>
          <h1 className="text-xl font-bold text-slate-800">{accountForm.fullName}</h1>
          <p className="text-sm text-slate-500">
            {student.enrollmentNo} · {accountForm.loginId} · {accountForm.email}
          </p>
          <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${
            student.User?.status === "active" ? "bg-green-100 text-green-700" :
            isLocked ? "bg-amber-100 text-amber-700" : "bg-slate-200 text-slate-600"
          }`}>
            {student.User?.status}
          </span>
        </div>
      </div>

      {msg && <p className="text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-md px-3 py-2">{msg}</p>}

      {/* Account identity + password/lock actions — admin only */}
      {isAdmin && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold text-slate-800 mb-3">Account & Login</h2>
          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
            <label className="flex flex-col gap-1">
              <span className="text-slate-500">Full Name</span>
              <input value={accountForm.fullName} onChange={(e) => setAccountForm({ ...accountForm, fullName: e.target.value })}
                className="border border-slate-300 rounded-md px-2 py-1.5" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-slate-500">Login ID</span>
              <input value={accountForm.loginId} onChange={(e) => setAccountForm({ ...accountForm, loginId: e.target.value })}
                className="border border-slate-300 rounded-md px-2 py-1.5" />
              <AvailabilityHint field="loginId" value={accountForm.loginId} original={student.User?.loginId} excludeUserId={student.User?.id} onResult={mark("loginId")} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-slate-500">Email</span>
              <input type="email" value={accountForm.email} onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })}
                className="border border-slate-300 rounded-md px-2 py-1.5" />
              <AvailabilityHint field="email" value={accountForm.email} original={student.User?.email} excludeUserId={student.User?.id} onResult={mark("email")} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-slate-500">Phone</span>
              <input value={accountForm.phone} onChange={(e) => setAccountForm({ ...accountForm, phone: e.target.value })}
                className="border border-slate-300 rounded-md px-2 py-1.5" />
              <AvailabilityHint field="phone" value={accountForm.phone} original={student.User?.phone} excludeUserId={student.User?.id} onResult={mark("phone")} />
            </label>
          </div>
          <button onClick={saveAccount} disabled={savingAccount || taken.loginId || taken.email || taken.phone}
            className="bg-[var(--brand-primary)] text-white text-sm rounded-md px-4 py-2 hover:bg-[var(--brand-primary-dark)] disabled:opacity-60">
            {savingAccount ? "Saving..." : "Save account details"}
          </button>

          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100">
            {isLocked && (
              <button onClick={handleUnlock} className="text-xs border border-slate-300 rounded-md px-3 py-1.5 hover:bg-slate-50">Unlock account</button>
            )}
            <button onClick={handleResetPassword} className="text-xs border border-slate-300 rounded-md px-3 py-1.5 hover:bg-slate-50">Force password reset</button>
            {isDisabled ? (
              <button onClick={() => handleStatus("active")} className="text-xs border border-green-300 text-green-700 rounded-md px-3 py-1.5 hover:bg-green-50">Enable account</button>
            ) : (
              <button onClick={() => handleStatus("disabled")} className="text-xs border border-red-300 text-red-600 rounded-md px-3 py-1.5 hover:bg-red-50">Disable account</button>
            )}
          </div>
        </div>
      )}

      {/* Profile photo — admin or faculty */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="font-semibold text-slate-800 mb-3">Profile Photo</h2>
        <PhotoUploader
          endpoint={`/students/${studentId}/photo`}
          currentUrl={student.User?.photoUrl}
          name={accountForm.fullName}
          onUploaded={(url) => setStudent((st) => ({ ...st, User: { ...st.User, photoUrl: url } }))}
        />
      </div>

      {/* Academic profile */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="font-semibold text-slate-800 mb-3">Academic Profile</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <label className="flex flex-col gap-1">
            <span className="text-slate-500">Enrollment No.</span>
            <input value={academicForm.enrollmentNo} onChange={(e) => setAcademicForm({ ...academicForm, enrollmentNo: e.target.value })}
              className="border border-slate-300 rounded-md px-2 py-1.5" />
              <AvailabilityHint field="enrollmentNo" value={academicForm.enrollmentNo} original={student.enrollmentNo} excludeStudentId={studentId} onResult={mark("enrollmentNo")} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-slate-500">Batch Year</span>
            <input type="number" value={academicForm.batchYear} onChange={(e) => setAcademicForm({ ...academicForm, batchYear: Number(e.target.value) })}
              className="border border-slate-300 rounded-md px-2 py-1.5" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-slate-500">Branch</span>
            <select value={academicForm.branch} onChange={(e) => setAcademicForm({ ...academicForm, branch: e.target.value })}
              className="border border-slate-300 rounded-md px-2 py-1.5">
              {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-slate-500">Semester</span>
            <input type="number" min="1" max="8" value={academicForm.currentSemester}
              onChange={(e) => setAcademicForm({ ...academicForm, currentSemester: Number(e.target.value) })}
              className="border border-slate-300 rounded-md px-2 py-1.5" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-slate-500">Status</span>
            <select value={academicForm.admissionStatus} onChange={(e) => setAcademicForm({ ...academicForm, admissionStatus: e.target.value })}
              className="border border-slate-300 rounded-md px-2 py-1.5">
              {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
            </select>
          </label>
        </div>
        <button onClick={saveAcademic} disabled={savingAcademic || taken.enrollmentNo}
          className="mt-4 bg-[var(--brand-primary)] text-white text-sm rounded-md px-4 py-2 hover:bg-[var(--brand-primary-dark)] disabled:opacity-60">
          {savingAcademic ? "Saving..." : "Save academic profile"}
        </button>
      </div>

      {/* Documents */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="font-semibold text-slate-800 mb-3">Documents</h2>
        {student.StudentDocuments?.length ? (
          <ul className="text-sm space-y-2 mb-4">
            {student.StudentDocuments.map((d) => (
              <li key={d.id} className="flex justify-between items-center border-b border-slate-100 pb-2">
                <span>{d.fileName} <span className="text-slate-400">({d.docType.replace(/_/g, " ")})</span></span>
                <button
                  onClick={() => verifyDoc(d.id, !d.verified)}
                  className={`text-xs px-2 py-0.5 rounded-full ${d.verified ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}
                >
                  {d.verified ? "Verified" : "Mark verified"}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-400 mb-4">No documents on file.</p>
        )}

        <form onSubmit={handleAddDocument} className="flex flex-wrap gap-2 items-end border-t border-slate-100 pt-4">
          <label className="flex flex-col gap-1 text-xs text-slate-500">
            Type
            <select value={newDoc.docType} onChange={(e) => setNewDoc({ ...newDoc, docType: e.target.value })}
              className="border border-slate-300 rounded-md px-2 py-1.5 text-sm">
              {DOC_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-500 flex-1 min-w-[140px]">
            File name
            <input required value={newDoc.fileName} onChange={(e) => setNewDoc({ ...newDoc, fileName: e.target.value })}
              placeholder="e.g. birth_certificate.pdf"
              className="border border-slate-300 rounded-md px-2 py-1.5 text-sm" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-500 flex-1 min-w-[140px]">
            Link (optional)
            <input value={newDoc.fileUrl} onChange={(e) => setNewDoc({ ...newDoc, fileUrl: e.target.value })}
              placeholder="https://..."
              className="border border-slate-300 rounded-md px-2 py-1.5 text-sm" />
          </label>
          <button type="submit" disabled={addingDoc}
            className="bg-[var(--brand-primary)] text-white text-sm rounded-md px-3 py-1.5 hover:bg-[var(--brand-primary-dark)] disabled:opacity-60">
            {addingDoc ? "Adding..." : "Add"}
          </button>
        </form>
      </div>

      {/* Certificate requests */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="font-semibold text-slate-800 mb-3">Certificate Requests</h2>
        {student.CertificateRequests?.length ? (
          <ul className="text-sm space-y-2">
            {student.CertificateRequests.map((r) => (
              <li key={r.id} className="flex justify-between items-center border-b border-slate-100 pb-2">
                <span>{r.certType.replace(/_/g, " ")} <span className="text-slate-400 capitalize">— {r.status.replace("_", " ")}</span></span>
                {r.status === "pending" && (
                  <div className="space-x-2">
                    <button onClick={() => updateCertRequest(r.id, "approved")} className="text-green-700 hover:underline text-xs">Approve</button>
                    <button onClick={() => updateCertRequest(r.id, "rejected")} className="text-red-600 hover:underline text-xs">Reject</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-400">No requests yet.</p>
        )}
      </div>
    </div>
  );
}
