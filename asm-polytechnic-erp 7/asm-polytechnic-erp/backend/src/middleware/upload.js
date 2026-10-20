const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const PHOTO_DIR = path.join(__dirname, "..", "..", "uploads", "photos");
fs.mkdirSync(PHOTO_DIR, { recursive: true });

// Extension comes from the validated MIME type, never from the uploaded
// filename — so a file called "x.php" or "../../evil" can't influence where
// or how it's stored. The name itself is a random UUID.
const EXT_BY_MIME = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, PHOTO_DIR),
  filename: (req, file, cb) => cb(null, crypto.randomUUID() + EXT_BY_MIME[file.mimetype]),
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!EXT_BY_MIME[file.mimetype]) {
      const err = new Error("Only JPG, PNG, or WebP images are allowed.");
      err.code = "BAD_FILE_TYPE";
      return cb(err);
    }
    cb(null, true);
  },
}).single("photo");

// Turns multer's errors into clean JSON responses instead of generic 500s.
function handlePhotoUpload(req, res, next) {
  upload(req, res, (err) => {
    if (!err) return next();
    if (err.code === "LIMIT_FILE_SIZE") return res.status(413).json({ error: "Photo must be 2 MB or smaller." });
    if (err.code === "BAD_FILE_TYPE") return res.status(400).json({ error: err.message });
    if (err instanceof multer.MulterError) return res.status(400).json({ error: "Invalid upload. Send one image in the 'photo' field." });
    return next(err);
  });
}

module.exports = { handlePhotoUpload, PHOTO_DIR };
