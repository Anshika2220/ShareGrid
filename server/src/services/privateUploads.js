const fs = require('node:fs/promises');
const path = require('node:path');
const multer = require('multer');
const env = require('../config/env');
const { httpError } = require('../utils/http');

const upload = multer({
  dest: path.resolve(env.privateUploadDir),
  limits: { fileSize: env.uploadMaxBytes, files: 1 },
  fileFilter(req, file, callback) {
    const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
    callback(allowed.has(file.mimetype) ? null : httpError(415, 'Evidence must be a JPEG, PNG, WebP image, or PDF'), allowed.has(file.mimetype));
  }
});

async function validateFileSignature(file) {
  const buffer = await fs.readFile(file.path);
  if (file.mimetype === 'image/jpeg') return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (file.mimetype === 'image/png') return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (file.mimetype === 'image/webp') return buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
  if (file.mimetype === 'application/pdf') return buffer.toString('ascii', 0, 5) === '%PDF-';
  return false;
}

function removeTemporaryFile(filePath) {
  fs.unlink(filePath).catch((error) => {
    if (error.code !== 'ENOENT') console.error('Unable to remove rejected evidence upload', error);
  });
}

module.exports = { upload, validateFileSignature, removeTemporaryFile };
