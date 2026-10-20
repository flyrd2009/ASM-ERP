// Every category a request to the backend can fail with, translated into a
// message that's actually useful to show someone on a login/auth screen.
// Used by every auth page so failures are handled consistently instead of
// each page guessing at err.response.data.error and breaking differently
// when the shape doesn't match what it expected.

export function getErrorMessage(err, fallback = "Something went wrong. Please try again.") {
  // Request was cancelled on purpose (component unmounted, user resubmitted
  // while a previous request was still in flight) — nothing to show.
  if (err?.code === "ERR_CANCELED" || err?.name === "CanceledError") {
    return null;
  }

  // Timed out — the request never got a response in time.
  if (err?.code === "ECONNABORTED") {
    return "The server took too long to respond. Check your connection and try again.";
  }

  // No response object at all: the request never reached the server —
  // offline, DNS failure, backend not running, CORS block, etc.
  if (!err?.response) {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      return "You appear to be offline. Check your internet connection and try again.";
    }
    return "Couldn't reach the server. It may be down, or check your internet connection.";
  }

  const { status, data } = err.response;

  // Rate limited
  if (status === 429) {
    return data?.error || "Too many attempts. Please wait a few minutes and try again.";
  }

  // Payload too large (shouldn't happen from normal use, but a malformed
  // client or a broken proxy could trigger it)
  if (status === 413) {
    return "That request was too large.";
  }

  // Server-side crash — never show the raw internals to the user
  if (status >= 500) {
    return "The server ran into a problem. Please try again in a moment.";
  }

  // Normal case: backend sent a structured { error: "..." } message
  if (data && typeof data.error === "string" && data.error.trim()) {
    return data.error;
  }

  // Backend responded, but not in the expected JSON shape — e.g. a proxy
  // or load balancer returned its own HTML error page instead of JSON.
  if (typeof data === "string" || data === undefined || data === null) {
    return fallback;
  }

  return fallback;
}

// Formats a "locked until" timestamp defensively — an invalid/missing date
// shouldn't crash the page or show "Invalid Date" to the user.
export function formatLockedUntil(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "shortly";
  return date.toLocaleTimeString();
}
