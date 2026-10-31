const crypto = require('node:crypto');
const env = require('../config/env');
const { httpError } = require('../utils/http');

const allowedFormats = 'jpg,png,webp';

function isConfigured(config = env) {
  return Boolean(config.cloudinaryCloudName && config.cloudinaryApiKey && config.cloudinaryApiSecret);
}

function createUploadSignature(userId, purpose, config = env, now = Date.now()) {
  if (!isConfigured(config)) throw httpError(503, 'Cloudinary image uploads are not configured');

  const timestamp = Math.floor(now / 1000);
  const folder = `sharegrid/${purpose}/${userId}`;
  const publicId = crypto.randomUUID();
  const params = {
    allowed_formats: allowedFormats,
    folder,
    overwrite: false,
    public_id: publicId,
    timestamp
  };
  const signatureBase = Object.keys(params).sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
  const signature = crypto.createHash('sha1')
    .update(`${signatureBase}${config.cloudinaryApiSecret}`)
    .digest('hex');

  return {
    cloudName: config.cloudinaryCloudName,
    apiKey: config.cloudinaryApiKey,
    signature,
    uploadUrl: `https://api.cloudinary.com/v1_1/${config.cloudinaryCloudName}/image/upload`,
    ...params
  };
}

function isUserCloudinaryImage(urlValue, userId, purpose, cloudName = env.cloudinaryCloudName) {
  if (!cloudName) return false;
  try {
    const url = new URL(urlValue);
    if (url.protocol !== 'https:' || url.hostname !== 'res.cloudinary.com' || url.port || url.search || url.hash) return false;
    const escapedCloudName = cloudName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedUserId = userId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`^/${escapedCloudName}/image/upload/v\\d+/sharegrid/${purpose}/${escapedUserId}/[0-9a-f-]{36}\\.(?:jpg|png|webp)$`, 'i')
      .test(url.pathname);
  } catch {
    return false;
  }
}

function assertUserCloudinaryImages(images, userId, purpose, cloudName = env.cloudinaryCloudName) {
  if (!cloudName || images.some((image) => !isUserCloudinaryImage(image, userId, purpose, cloudName))) {
    throw httpError(400, 'Photos must be uploaded to Cloudinary using your signed ShareGrid upload');
  }
}

module.exports = { createUploadSignature, isUserCloudinaryImage, assertUserCloudinaryImages, isConfigured };
