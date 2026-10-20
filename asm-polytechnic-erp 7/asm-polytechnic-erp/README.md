# ASM Polytechnic ERP

A secure, multi-role ERP web app for ASM Polytechnic. Built module by module —
Login & Session Management and the Student Information System (SIS) are live;
the rest of the blueprint (Admission, Fees, Attendance, Exams, Library,
HR/Payroll, Hostel/Transport, Placement, Communication, Reports) builds out
from the same foundation.

## Stack

- **Backend:** Node.js + Express + PostgreSQL (Sequelize)
- **Frontend:** React + Vite + Tailwind CSS
- **Auth:** JWT access tokens (15 min) + httpOnly refresh cookie (7 days)

## What's built

### 1. Login & Session Management
- Multi-role login (admin / faculty / student / parent / accounts), single entry point
- Account lockout after N failed attempts, per-role configurable
- Admin unlock **and** admin-reset now issue a genuine temporary password —
  the old password stops working immediately, not just "on next login attempt"
- Two-factor authentication (email OTP), mandatory for admin, configurable per role
- Password policy: strength rules, no reuse of last 5 passwords
- Inactivity auto-logout, per-role timeout, warning modal 60s before logout
- Active sessions panel — revoke one device or all devices
- New-device email alerts, full login audit trail (`LoginAttempt`)

### 2. Admin Console
- User management: search/filter, create accounts (any role), unlock, disable/enable, force password reset
- Security settings: per-role session timeout, lockout threshold, 2FA requirement, single-session enforcement — all editable in the browser, with sane min/max bounds enforced server-side

### 3. Student Information System (SIS)
- Student profile: enrollment no., branch, batch year, current semester, guardian info
- Self-service student portal: view profile, upload document records, request certificates (bonafide / transfer / migration / provisional marksheet)
- Admin/faculty: enroll profiles onto existing accounts, edit academic fields, verify documents, approve/reject certificate requests

## Security hardening in this pass

- **Fixed:** admin unlock/reset previously left the old password valid (only set a flag) — now issues and hashes a real temporary password, and revokes all existing sessions
- **Fixed:** async errors in route handlers (Express 4 doesn't catch these by default) could crash or hang requests silently — added `express-async-errors` so every thrown/rejected error reaches the central error handler
- **Fixed:** a route/param mismatch meant a student's own document uploads were silently mis-attributed — split into dedicated self-service vs. admin-on-behalf-of functions
- Input validation (`express-validator`) on every write endpoint that takes untrusted input: login, OTP, password reset, account creation, student enrollment
- `xss-clean` strips script/HTML injection attempts from body/query/params; `hpp` blocks HTTP parameter-pollution tricks
- `helmet` with an explicit CSP (`default-src 'none'` — this is a pure JSON API) and locked-down `Cross-Origin-Resource-Policy`
- Two-tier rate limiting: a strict limiter on auth endpoints (login/OTP/reset), plus a general limiter across all `/api/*` routes
- Request body size capped at 50kb to blunt oversized-payload abuse
- `trust proxy` enabled — required for correct client IPs (and therefore correct rate-limiting and audit logs) behind Render/Neon or any reverse proxy
- Central error handler never leaks stack traces, SQL, or internal messages to the client — everything sensitive is logged server-side only
- Admins can't disable their own account (self-lockout guard)
- Security settings have enforced bounds (e.g. session timeout 5–180 min) so a typo can't accidentally disable login for a whole role
- Refresh tokens are stored hashed (SHA-256), same principle as passwords — a DB leak alone doesn't hand out valid sessions
- Cookies: `httpOnly`, `sameSite: strict`, `secure` in production

## Setup

### 1. Database
Free PostgreSQL from [neon.tech](https://neon.tech) or [render.com](https://render.com) — no local install needed.

### 2. Backend
```bash
cd backend
npm install
cp .env.example .env
# fill in DATABASE_URL, JWT secrets, SMTP credentials, SEED_ADMIN_EMAIL/PASSWORD
npm run seed:admin
npm run dev
```

### 3. Frontend
```bash
cd frontend
npm install
cp .env.example .env   # only needed if your backend isn't on localhost:5000
npm run dev
```

Open `http://localhost:5173`, log in with the seeded admin account, set a new
password when prompted — you're in.

## Project layout

```
backend/
  src/
    config/db.js              Sequelize/Postgres connection
    models/                   User, Session, SecuritySetting, OtpVerification,
                               PasswordHistory, LoginAttempt, Student,
                               StudentDocument, CertificateRequest
    controllers/               authController, adminController, studentController
    middleware/                auth (JWT), rbac (roles), rateLimiters, validators
    routes/                    authRoutes, adminRoutes, studentRoutes
    utils/                      token, password, otp, mailer, seedAdmin
    server.js                  Express app entry point

frontend/
  src/
    api/client.js               Axios instance, auto token refresh
    context/AuthContext.jsx     Login state + inactivity timer
    components/                 AppLayout (nav), ProtectedRoute, SessionTimeoutModal
    pages/                      Login, ForgotPassword, ResetPassword, VerifyOtp,
                                 Dashboard, MyProfile, StudentList, StudentDetail
    pages/admin/                 AdminUsers, AdminSecuritySettings
```

## What's next

Suggested build order for the remaining blueprint modules: Attendance → Fees
→ Examinations — roughly in order of how often students touch each one. Each
new module follows the same pattern: a model, a controller behind
`requireAuth` + `requireRole(...)`, a route file, and a page under
`frontend/src/pages/`.

## Photos, WhatsApp OTP, and duplicate checks

**Profile photos** — real file upload (JPG/PNG/WebP, max 2 MB), stored on the
backend server in `backend/uploads/photos/` and served at `/uploads/...`.
Admin or faculty can upload a student's photo (Manage Student page); admin can
upload a photo for any account (User Management → Edit). Files are validated by
type, size, and actual file contents, and renamed to random IDs.

**WhatsApp OTP** — mobile OTPs are delivered over WhatsApp using Baileys
(open source, self-hosted). Set `WHATSAPP_ENABLED=true` in `backend/.env`,
start the backend, and scan the QR shown in the terminal with the sender's
WhatsApp (Settings → Linked devices). Use a dedicated number: Baileys is an
unofficial client and WhatsApp can restrict numbers that use one.

**Duplicate checks** — the Add/Edit user and Manage Student forms flag an
email, Login ID, mobile number, or enrollment number that's already registered
while you type. Mobile numbers are compared ignoring spaces/+91/leading 0, and
each number can belong to only one account (needed so mobile OTP login is
unambiguous).

**One-time database step** (new column — Sequelize never alters existing tables):
```sql
ALTER TABLE users ADD COLUMN photo_url VARCHAR(255);
```
