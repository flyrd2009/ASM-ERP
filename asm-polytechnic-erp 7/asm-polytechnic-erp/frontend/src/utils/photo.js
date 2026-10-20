const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Uploaded photos are stored as relative paths ("/uploads/photos/<id>.jpg")
// and served by the backend, which may be on a different origin than the
// frontend — so prefix them with the API's origin to get a loadable URL.
export const API_ORIGIN = API_URL.replace(/\/api\/?$/, "");

export function photoSrc(url) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return API_ORIGIN + url;
}
