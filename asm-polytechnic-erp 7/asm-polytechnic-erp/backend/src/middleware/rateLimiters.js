const rateLimit = require("express-rate-limit");

// Applies on top of the app-level account lockout — this stops brute-force
// attempts across many different accounts/IPs, not just one account.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20, // 20 attempts per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts from this network. Try again later." },
});

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many code requests. Try again later." },
});

const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many password reset requests. Try again later." },
});

// Baseline limiter for every /api/* route — generous enough not to bother
// normal usage, but stops naive scraping/DoS against endpoints that don't
// have their own stricter limiter (admin listing, student search, etc).
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down." },
});

module.exports = { loginLimiter, otpLimiter, passwordResetLimiter, apiLimiter };
