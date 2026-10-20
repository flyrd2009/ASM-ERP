import { photoSrc } from "../utils/photo";

// Profile photo, falling back to the person's initial when there isn't one.
export default function Avatar({ photoUrl, name, size = "w-10 h-10", text = "text-sm", className = "" }) {
  const src = photoSrc(photoUrl);
  if (src) {
    return <img src={src} alt={name || "Profile photo"} className={`${size} rounded-full object-cover border border-slate-200 ${className}`} />;
  }
  return (
    <div className={`${size} rounded-full bg-slate-200 text-slate-500 font-semibold flex items-center justify-center ${text} ${className}`}>
      {name?.trim()?.[0]?.toUpperCase() || "?"}
    </div>
  );
}
