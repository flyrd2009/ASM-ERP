// Sends OTPs over WhatsApp using Baileys (@whiskeysockets/baileys) — an
// open-source WhatsApp Web client. Free and self-hosted: no Meta business
// account or paid API. The server logs in as a normal WhatsApp account
// (the "sender") by scanning a QR code once; the session is then saved to
// backend/.wa-auth/ and reconnects automatically on restart.
//
// Setup:
//   1. In backend/.env set WHATSAPP_ENABLED=true
//   2. Start the backend. A QR code is printed in the terminal.
//   3. On the sender phone: WhatsApp > Settings > Linked devices > Link a
//      device > scan the QR.
//   4. Done. Keep backend/.wa-auth/ private (it's the logged-in session).
//
// IMPORTANT caveats:
//   - Baileys is an UNOFFICIAL client. WhatsApp's terms prohibit automated
//     use of unofficial clients, so the sender number can be restricted or
//     banned. Use a dedicated number, never a personal one. For a
//     production deployment, the official WhatsApp Cloud API is the
//     compliant option.
//   - It's reverse-engineered, so a WhatsApp update can break it until the
//     library is updated.
//
// Like mailer.js, nothing here ever throws into a request path: if WhatsApp
// isn't enabled/connected, the OTP is logged as undelivered and the request
// carries on.

const path = require("path");

const AUTH_DIR = path.join(__dirname, "..", "..", ".wa-auth");
const DEFAULT_COUNTRY_CODE = (process.env.WHATSAPP_DEFAULT_COUNTRY_CODE || "91").replace(/\D/g, "");

let sock = null;
let status = "disabled"; // disabled | connecting | open | logged_out
let reconnectTimer = null;

function isEnabled() {
  return String(process.env.WHATSAPP_ENABLED).toLowerCase() === "true";
}

async function initWhatsApp() {
  if (!isEnabled()) {
    console.log("WhatsApp OTP delivery is disabled (set WHATSAPP_ENABLED=true in .env to enable).");
    return;
  }

  try {
    // Dynamic import so this works whether the installed Baileys build is
    // CommonJS or ESM.
    const baileys = await import("@whiskeysockets/baileys");
    const pino = require("pino");
    const qrcode = require("qrcode-terminal");

    const makeWASocket = baileys.default?.default || baileys.default || baileys.makeWASocket;
    const useMultiFileAuthState = baileys.useMultiFileAuthState || baileys.default?.useMultiFileAuthState;
    const DisconnectReason = baileys.DisconnectReason || baileys.default?.DisconnectReason;

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    status = "connecting";

    sock = makeWASocket({ auth: state, logger: pino({ level: "silent" }), browser: ["ASM ERP", "Chrome", "1.0"] });
    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.log("\nWhatsApp: scan this QR with the sender phone (Linked devices > Link a device):\n");
        qrcode.generate(qr, { small: true });
      }

      if (connection === "open") {
        status = "open";
        console.log("WhatsApp connected — OTPs will be delivered over WhatsApp.");
      }

      if (connection === "close") {
        const code = lastDisconnect?.error?.output?.statusCode;
        if (code === DisconnectReason.loggedOut) {
          status = "logged_out";
          console.error(
            "WhatsApp session was logged out. Delete backend/.wa-auth/ and restart the backend to scan a new QR."
          );
          return;
        }
        status = "connecting";
        clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(() => initWhatsApp().catch((e) => console.error("WhatsApp reconnect failed:", e.message)), 5000);
      }
    });
  } catch (err) {
    status = "disabled";
    console.error(
      "WhatsApp failed to start (is @whiskeysockets/baileys installed? did you run npm install?):",
      err.message
    );
  }
}

// Digits only, with country code. A bare 10-digit number gets the default
// country code (India, 91, unless WHATSAPP_DEFAULT_COUNTRY_CODE overrides it).
function toWhatsAppNumber(raw) {
  let digits = String(raw || "").replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 10) digits = DEFAULT_COUNTRY_CODE + digits;
  return digits;
}

async function sendWhatsAppMessage(to, text) {
  if (!isEnabled() || !sock || status !== "open") {
    console.warn(
      `⚠ WhatsApp not ready (status: ${status}) — OTP for ${to} was NOT delivered. ` +
      "Enable it and scan the QR (see utils/whatsapp.js)."
    );
    return { delivered: false };
  }

  const number = toWhatsAppNumber(to);
  if (number.length < 11) throw new Error("Invalid phone number for WhatsApp.");

  const [result] = await sock.onWhatsApp(`${number}@s.whatsapp.net`);
  if (!result?.exists) throw new Error("That number is not registered on WhatsApp.");

  await sock.sendMessage(result.jid, { text });
  return { delivered: true };
}

function otpWhatsAppMessage(otp, purpose) {
  const purposeText = {
    password_reset: "reset your ASM Polytechnic ERP password",
    otp_login: "log in to ASM Polytechnic ERP",
  }[purpose] || "verify your identity";

  return `*${otp}* is your code to ${purposeText}.\nIt expires in 15 minutes. Never share this code with anyone.`;
}

module.exports = { initWhatsApp, sendWhatsAppMessage, otpWhatsAppMessage };
