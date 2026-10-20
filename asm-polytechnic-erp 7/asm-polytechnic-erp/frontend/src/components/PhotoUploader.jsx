import { useState, useRef } from "react";
import api from "../api/client";
import Avatar from "./Avatar";
import { getErrorMessage } from "../utils/apiError";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

// Pick an image, see a preview, upload it to `endpoint` (multipart, field
// "photo"). The server re-validates type, size, and actual file contents —
// the checks here are just so mistakes are caught before a round trip.
export default function PhotoUploader({ endpoint, currentUrl, name, onUploaded }) {
  const [photoUrl, setPhotoUrl] = useState(currentUrl || null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const inputRef = useRef(null);

  function handlePick(e) {
    setError("");
    setSuccess("");
    const picked = e.target.files?.[0];
    if (!picked) return;
    if (!ALLOWED.includes(picked.type)) {
      setError("Choose a JPG, PNG, or WebP image.");
      e.target.value = "";
      return;
    }
    if (picked.size > MAX_BYTES) {
      setError("Photo must be 2 MB or smaller.");
      e.target.value = "";
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setFile(picked);
    setPreview(URL.createObjectURL(picked));
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError("");
    setSuccess("");
    try {
      const form = new FormData();
      form.append("photo", file);
      const { data } = await api.post(endpoint, form); // browser sets the multipart boundary
      setPhotoUrl(data.photoUrl);
      setSuccess("Photo uploaded.");
      setFile(null);
      if (preview) URL.revokeObjectURL(preview);
      setPreview(null);
      if (inputRef.current) inputRef.current.value = "";
      onUploaded?.(data.photoUrl);
    } catch (err) {
      setError(getErrorMessage(err, "Could not upload photo.") || "Could not upload photo.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      {preview ? (
        <img src={preview} alt="Preview" className="w-16 h-16 rounded-full object-cover border-2 border-[var(--brand-primary)]" />
      ) : (
        <Avatar photoUrl={photoUrl} name={name} size="w-16 h-16" text="text-xl" />
      )}
      <div className="space-y-1.5">
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePick} className="block text-xs text-slate-600" />
        {file && (
          <button type="button" onClick={handleUpload} disabled={uploading}
            className="bg-[var(--brand-primary)] text-white text-xs rounded-md px-3 py-1.5 hover:bg-[var(--brand-primary-dark)] disabled:opacity-60">
            {uploading ? "Uploading..." : "Upload photo"}
          </button>
        )}
        <p className="text-xs text-slate-400">JPG, PNG or WebP, up to 2 MB.</p>
        {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
        {success && <p className="text-xs text-green-600">{success}</p>}
      </div>
    </div>
  );
}
