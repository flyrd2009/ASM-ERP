// Replaces xss-clean, which is unmaintained and crashes on current Express
// 4.x versions: Express made `req.query` a getter-only property (as part of
// hardening against prototype-pollution attacks), and xss-clean tries to do
// `req.query = <new object>` — a whole-object reassignment — which throws
// `TypeError: Cannot set property query of #<IncomingMessage> which has
// only a getter` on the very first request that reaches it.
//
// This does the same job (strip script/HTML injection attempts from string
// input) but only ever mutates VALUES inside req.body/req.query/req.params,
// never reassigns the objects themselves — which is safe under a getter too.

function sanitizeValue(value) {
  if (typeof value === "string") {
    return value
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<[^>]*>/g, "")
      .trim();
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value && typeof value === "object") {
    for (const key of Object.keys(value)) {
      value[key] = sanitizeValue(value[key]);
    }
    return value;
  }
  return value;
}

function sanitizeInput(req, res, next) {
  if (req.body && typeof req.body === "object") sanitizeValue(req.body);
  if (req.query && typeof req.query === "object") sanitizeValue(req.query);
  if (req.params && typeof req.params === "object") sanitizeValue(req.params);
  next();
}

module.exports = { sanitizeInput };
