const fs = require('node:fs/promises');
const path = require('node:path');
const { pipeline } = require('node:stream/promises');
const env = require('../config/env');
const { httpError } = require('../utils/http');

function createPrivateStorage(directory) {
  async function storeFile(file) {
    return { storedName: path.basename(file.filename), storageProvider: 'local' };
  }

  async function getFile(storageProvider, storedName) {
    if (storageProvider !== 'local') {
      throw httpError(410, 'This evidence uses a retired storage provider and must be migrated');
    }
    const root = path.resolve(directory);
    const filePath = path.resolve(root, storedName);
    if (!filePath.startsWith(root + path.sep)) throw httpError(404, 'Evidence not found');
    const handle = await fs.open(filePath, 'r');
    return handle.createReadStream();
  }

  async function deleteFile(storageProvider, storedName) {
    if (storageProvider !== 'local') {
      throw httpError(410, 'This evidence uses a retired storage provider and must be migrated');
    }
    const root = path.resolve(directory);
    const filePath = path.resolve(root, storedName);
    if (!filePath.startsWith(root + path.sep)) throw httpError(404, 'Evidence not found');
    await removeTemporaryFile(filePath);
  }

  async function streamFile(res, evidence) {
    const stream = await getFile(evidence.storageProvider || 'local', evidence.storedName);
    res.type(evidence.mimeType);
    res.set('Cache-Control', 'private, no-store');
    res.set('Content-Disposition', `inline; filename="${path.basename(evidence.originalName).replace(/["\\]/g, '')}"`);
    await pipeline(stream, res);
  }

  return { storeFile, getFile, deleteFile, streamFile };
}

async function removeTemporaryFile(filePath) {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

const privateStorage = createPrivateStorage(env.privateUploadDir);

module.exports = { ...privateStorage, createPrivateStorage, removeTemporaryFile };
