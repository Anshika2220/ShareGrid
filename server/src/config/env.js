require('dotenv').config();

const required = ['MONGO_URI', 'JWT_SECRET'];
for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing required environment variable: ${key}`);
}
if (process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters long');
}

const nodeEnv = process.env.NODE_ENV || 'development';
const cloudinaryConfig = [
  process.env.CLOUDINARY_CLOUD_NAME,
  process.env.CLOUDINARY_API_KEY,
  process.env.CLOUDINARY_API_SECRET
];
if (cloudinaryConfig.some(Boolean) && !cloudinaryConfig.every(Boolean)) {
  throw new Error('CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET must be configured together');
}
if (nodeEnv === 'production' && !cloudinaryConfig.every(Boolean)) {
  throw new Error('Cloudinary credentials are required in production');
}

module.exports = {
  port: Number(process.env.PORT || 5000),
  nodeEnv,
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpSecure: process.env.SMTP_SECURE === 'true',
  smtpUser: process.env.SMTP_USER || '',
  smtpPassword: process.env.SMTP_PASSWORD || '',
  mailFrom: process.env.MAIL_FROM || 'ShareGrid <no-reply@sharegrid.local>',
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || '',
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || '',
  emailVerificationExpiresHours: Number(process.env.EMAIL_VERIFICATION_EXPIRES_HOURS || 24),
  privateUploadDir: process.env.PRIVATE_UPLOAD_DIR || './private-uploads',
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || '',
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || '',
  uploadMaxBytes: Number(process.env.UPLOAD_MAX_BYTES || 10 * 1024 * 1024),
  demoPaymentsEnabled: process.env.DEMO_PAYMENTS_ENABLED === 'true',
  adminEmails: (process.env.ADMIN_EMAILS || '').split(',').map((email) => email.trim().toLowerCase()).filter(Boolean)
};
