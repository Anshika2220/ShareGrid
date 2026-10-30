const crypto = require('node:crypto');
const { createReadStream } = require('node:fs');
const fs = require('node:fs/promises');
const path = require('node:path');
const { pipeline } = require('node:stream/promises');
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const env = require('../config/env');
const { httpError } = require('../utils/http');

function createPrivateStorage(config, injectedClient) {
  const client = config.driver === 's3' ? injectedClient || new S3Client({
    region: config.region,
    endpoint: config.endpoint || undefined,
    forcePathStyle: config.forcePathStyle,
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
    ...(config.accessKeyId ? { credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey } } : {})
  }) : undefined;

  async function storeFile(file) {
    if (config.driver === 'local') return { storedName: path.basename(file.filename), storageProvider: 'local' };

    const key = `evidence/${crypto.randomUUID()}`;
    let uploadFailed = false;
    let uploadError;
    try {
      await client.send(new PutObjectCommand({
        Bucket: config.bucket,
        Key: key,
        Body: createReadStream(file.path),
        ContentLength: file.size,
        ContentType: file.mimetype
      }));
    } catch (error) {
      uploadFailed = true;
      uploadError = error;
    } finally {
      try {
        await removeTemporaryFile(file.path);
      } catch (cleanupError) {
        console.error('Unable to remove temporary evidence upload', cleanupError);
      }
    }
    if (uploadFailed) throw uploadError;
    return { storedName: key, storageProvider: 's3' };
  }

  async function getFile(storageProvider, storedName) {
    if (storageProvider === 's3') {
      if (!client || !config.bucket) throw new Error('S3 evidence storage is not configured');
      const result = await client.send(new GetObjectCommand({ Bucket: config.bucket, Key: storedName }));
      return result.Body;
    }
    if (storageProvider !== 'local') throw new Error('Unsupported private evidence storage provider');
    const root = path.resolve(config.directory);
    const filePath = path.resolve(root, storedName);
    if (!filePath.startsWith(root + path.sep)) throw httpError(404, 'Evidence not found');
    const handle = await fs.open(filePath, 'r');
    return handle.createReadStream();
  }

  async function deleteFile(storageProvider, storedName) {
    if (storageProvider === 's3') {
      if (!client || !config.bucket) throw new Error('S3 evidence storage is not configured');
      await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: storedName }));
      return;
    }
    if (storageProvider !== 'local') throw new Error('Unsupported private evidence storage provider');
    const root = path.resolve(config.directory);
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

const privateStorage = createPrivateStorage({
  driver: env.privateStorageDriver,
  directory: env.privateUploadDir,
  bucket: env.s3Bucket,
  region: env.s3Region,
  endpoint: env.s3Endpoint,
  forcePathStyle: env.s3ForcePathStyle,
  accessKeyId: env.s3AccessKeyId,
  secretAccessKey: env.s3SecretAccessKey
});

module.exports = { ...privateStorage, createPrivateStorage };
