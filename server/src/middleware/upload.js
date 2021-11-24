const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { HttpError } = require('../utils/http');

const UPLOAD_DIR = path.resolve(__dirname, '../..', process.env.UPLOAD_DIR || 'uploads');
const MAX_FILE_SIZE_MB = Number(process.env.MAX_FILE_SIZE_MB) || 10;

const ALLOWED_EXTENSIONS = [
  '.pdf', '.doc', '.docx', '.txt', '.md', '.rtf', '.odt',
  '.ppt', '.pptx', '.xls', '.xlsx', '.csv',
  '.png', '.jpg', '.jpeg', '.gif',
  '.zip', '.rar', '.7z',
  '.py', '.js', '.java', '.c', '.cpp', '.h', '.html', '.css', '.sql', '.ipynb',
];

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomBytes(16).toString('hex')}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXTENSIONS.includes(ext)) return cb(null, true);
    return cb(new HttpError(400, `File type ${ext || '(none)'} is not allowed`));
  },
});

function storedFilePath(storedName) {
  return path.join(UPLOAD_DIR, path.basename(storedName));
}

function removeFile(storedName) {
  if (!storedName) return;
  fs.unlink(storedFilePath(storedName), () => {});
}

// Like asyncHandler, but deletes the just-uploaded file if the handler fails
const cleanupOnError = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch((err) => {
    if (req.file) removeFile(req.file.filename);
    next(err);
  });

function sendStoredFile(res, storedName, downloadName) {
  const fullPath = storedFilePath(storedName);
  if (!fs.existsSync(fullPath)) {
    throw new HttpError(404, 'File no longer exists on the server');
  }
  res.download(fullPath, downloadName);
}

module.exports = { upload, removeFile, cleanupOnError, sendStoredFile, MAX_FILE_SIZE_MB };
