const fs = require("fs");
const path = require("path");
const { User, Student } = require("../models");
const { PHOTO_DIR } = require("../middleware/upload");

// The MIME type comes from the client and can be faked, so also check the
// file's actual first bytes (magic numbers) before accepting it.
function hasImageSignature(filePath) {
  const fd = fs.openSync(filePath, "r");
  const buf = Buffer.alloc(12);
  fs.readSync(fd, buf, 0, 12, 0);
  fs.closeSync(fd);
  const jpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  const png = buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const webp = buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP";
  return jpeg || png || webp;
}

function discard(file) {
  if (file?.path) fs.unlink(file.path, () => {});
}

function removeOldPhoto(url) {
  if (!url || !url.startsWith("/uploads/photos/")) return;
  fs.unlink(path.join(PHOTO_DIR, path.basename(url)), () => {});
}

async function savePhoto(req, res, user) {
  if (!req.file) return res.status(400).json({ error: "Choose an image to upload." });
  if (!user) {
    discard(req.file);
    return res.status(404).json({ error: "Account not found." });
  }
  if (!hasImageSignature(req.file.path)) {
    discard(req.file);
    return res.status(400).json({ error: "That file isn't a valid image." });
  }

  const previous = user.photoUrl;
  user.photoUrl = `/uploads/photos/${req.file.filename}`;
  await user.save();
  removeOldPhoto(previous);

  return res.status(200).json({ message: "Photo updated.", photoUrl: user.photoUrl });
}

// Admin or faculty: upload a STUDENT's photo.
async function uploadStudentPhoto(req, res) {
  const student = await Student.findByPk(req.params.studentId, { include: [{ model: User }] });
  return savePhoto(req, res, student?.User);
}

// Admin only: upload a photo for ANY account (faculty, staff, admin, parent, accounts, student).
async function uploadUserPhoto(req, res) {
  const user = await User.findByPk(req.params.userId);
  return savePhoto(req, res, user);
}

module.exports = { uploadStudentPhoto, uploadUserPhoto };
