// Replaces hpp, which has the same crash-on-modern-Express issue as
// xss-clean (see sanitize.js) — it also reassigns req.query wholesale.
//
// Same protection: if a query param appears more than once
// (?role=admin&role=student), collapse it to just the last value instead of
// leaving an array that downstream code doesn't expect. Mutates individual
// keys in place — never reassigns req.query itself.

function preventParamPollution(req, res, next) {
  if (req.query && typeof req.query === "object") {
    for (const key of Object.keys(req.query)) {
      if (Array.isArray(req.query[key])) {
        req.query[key] = req.query[key][req.query[key].length - 1];
      }
    }
  }
  next();
}

module.exports = { preventParamPollution };
