require('dotenv').config();

const required = ['MONGO_URI', 'JWT_SECRET'];
for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing required environment variable: ${key}`);
}
if (process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters long');
}

const nodeEnv = process.env.NODE_ENV || 'development';
const privateStorageDriver = process.env.PRIVATE_STORAGE_DRIVER || 'local';
if (!['local', 's3'].includes(privateStorageDriver)) {
  throw new Error('PRIVATE_STORAGE_DRIVER must be either local or s3');
}
if (privateStorageDriver === 's3') {
  if (!process.env.S3_BUCKET) throw new Error('S3_BUCKET is required when PRIVATE_STORAGE_DRIVER=s3');
  if (Boolean(process.env.S3_ACCESS_KEY_ID) !== Boolean(process.env.S3_SECRET_ACCESS_KEY)) {
    throw new Error('S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY must be configured together');
  }
  if (process.env.S3_ENDPOINT) {
    const endpoint = new URL(process.env.S3_ENDPOINT);
    if (nodeEnv === 'production' && endpoint.protocol !== 'https:') {
      throw new Error('S3_ENDPOINT must use HTTPS in production');
    }
    if (endpoint.username || endpoint.password || endpoint.search || endpoint.hash) {
      throw new Error('S3_ENDPOINT must not contain credentials, query parameters, or a fragment');
    }
  }
}

module.exports = {
  port: Number(process.env.PORT || 5000),
  nodeEnv,
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpSecure: process.env.SMTP_SECURE === 'true',
  smtpUser: process.env.SMTP_USER || '',
  smtpPassword: process.env.SMTP_PASSWORD || '',
  mailFrom: process.env.MAIL_FROM || 'ShareGrid <no-reply@sharegrid.local>',
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || '',
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || '',
  twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
  twilioMessagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID || '',
  emailVerificationExpiresHours: Number(process.env.EMAIL_VERIFICATION_EXPIRES_HOURS || 24),
  privateUploadDir: process.env.PRIVATE_UPLOAD_DIR || './private-uploads',
  privateStorageDriver,
  s3Bucket: process.env.S3_BUCKET || '',
  s3Region: process.env.S3_REGION || 'us-east-1',
  s3Endpoint: process.env.S3_ENDPOINT || '',
  s3ForcePathStyle: process.env.S3_FORCE_PATH_STYLE !== 'false',
  s3AccessKeyId: process.env.S3_ACCESS_KEY_ID || '',
  s3SecretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
  uploadMaxBytes: Number(process.env.UPLOAD_MAX_BYTES || 10 * 1024 * 1024),
  demoPaymentsEnabled: process.env.DEMO_PAYMENTS_ENABLED === 'true',
  adminEmails: (process.env.ADMIN_EMAILS || '').split(',').map((email) => email.trim().toLowerCase()).filter(Boolean)
};
