const crypto = require('node:crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const { User } = require('../models');
const { authenticate } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const env = require('../config/env');
const { send, httpError } = require('../utils/http');
const { isConfigured, sendAccountEmail } = require('../services/email');
const { isConfigured: isSmsConfigured, sendVerificationCode } = require('../services/sms');
const phoneVerificationRateLimit = require('express-rate-limit')({
  windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false
});

const router = express.Router();
const registerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().email().transform((value) => value.toLowerCase()),
  phone: z.string().trim().max(30).optional(),
  password: z.string().min(10).max(128)
});
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

function issueToken(user) {
  return jwt.sign({ sub: user.id, tokenVersion: user.tokenVersion }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

function publicUser(user) {
  return {
    id: user.id, name: user.name, email: user.email, phone: user.phone,
    phoneVerifiedAt: user.phoneVerifiedAt, status: user.status, roles: user.roles, profile: user.profile,
    honorScore: user.honorScore, averageRating: user.averageRating, ratingCount: user.ratingCount
  };
}

router.post('/register', asyncHandler(async (req, res) => {
  if (env.nodeEnv === 'production' && !isConfigured()) {
    throw httpError(503, 'Email delivery must be configured before production registration');
  }
  const input = registerSchema.parse(req.body);
  if (await User.exists({ email: input.email })) throw httpError(409, 'An account with this email already exists');
  const passwordHash = await bcrypt.hash(input.password, 12);
  const roles = env.adminEmails.includes(input.email) ? ['user', 'admin'] : ['user'];
  const user = await User.create({ name: input.name, email: input.email, phone: input.phone, passwordHash, roles });
  const verificationToken = crypto.randomBytes(32).toString('hex');
  user.emailVerificationTokenHash = crypto.createHash('sha256').update(verificationToken).digest('hex');
  user.emailVerificationExpiresAt = new Date(Date.now() + env.emailVerificationExpiresHours * 60 * 60 * 1000);
  await user.save();
  if (isConfigured()) {
    await sendAccountEmail({
      to: user.email,
      subject: 'Verify your ShareGrid email',
      text: `Use this one-time code to verify your ShareGrid account: ${verificationToken}\nIt expires in ${env.emailVerificationExpiresHours} hours.`
    });
  }
  send(res, 201, 'Account created', {
    user: publicUser(user),
    token: issueToken(user),
    ...(!isConfigured() && env.nodeEnv !== 'production' ? { emailVerificationToken: verificationToken } : {})
  });
}));

router.post('/login', asyncHandler(async (req, res) => {
  const input = loginSchema.parse(req.body);
  const user = await User.findOne({ email: input.email.toLowerCase() }).select('+passwordHash');
  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) throw httpError(401, 'Invalid email or password');
  if (user.status !== 'active') throw httpError(403, 'This account is not active');
  send(res, 200, 'Signed in', { user: publicUser(user), token: issueToken(user) });
}));

router.post('/logout', authenticate, asyncHandler(async (req, res) => {
  req.user.tokenVersion += 1;
  await req.user.save();
  send(res, 200, 'Signed out on all active sessions', {});
}));

router.get('/me', authenticate, (req, res) => send(res, 200, 'Current account', { user: publicUser(req.user) }));

router.post('/phone-verification/send', authenticate, phoneVerificationRateLimit, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id)
    .select('+phoneVerificationTokenHash +phoneVerificationExpiresAt +phoneVerificationAttempts +phoneVerificationSentAt');
  if (!user || !user.phone || !/^\+[1-9]\d{7,14}$/.test(user.phone)) {
    throw httpError(400, 'Add a valid E.164 phone number to your profile before requesting verification');
  }
  if (user.phoneVerifiedAt) return send(res, 200, 'Phone number is already verified', {});
  if (user.phoneVerificationSentAt && Date.now() - user.phoneVerificationSentAt.getTime() < 60_000) {
    throw httpError(429, 'Wait at least one minute before requesting another verification code');
  }
  if (env.nodeEnv === 'production' && !isSmsConfigured()) {
    throw httpError(503, 'SMS delivery must be configured before production phone verification');
  }
  const code = crypto.randomInt(100000, 1000000).toString();
  user.phoneVerificationTokenHash = crypto.createHash('sha256').update(code).digest('hex');
  user.phoneVerificationExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
  user.phoneVerificationAttempts = 0;
  user.phoneVerificationSentAt = new Date();
  await user.save();
  if (isSmsConfigured()) {
    try {
      await sendVerificationCode(user.phone, code);
    } catch (error) {
      await user.updateOne({
        $unset: { phoneVerificationTokenHash: 1, phoneVerificationExpiresAt: 1, phoneVerificationSentAt: 1 },
        $set: { phoneVerificationAttempts: 0 }
      });
      throw error;
    }
  }
  send(res, 200, 'Phone verification code sent', {
    ...(!isSmsConfigured() && env.nodeEnv !== 'production' ? { verificationCode: code } : {})
  });
}));

router.post('/phone-verification/verify', authenticate, phoneVerificationRateLimit, asyncHandler(async (req, res) => {
  const input = z.object({ code: z.string().regex(/^\d{6}$/) }).parse(req.body);
  const tokenHash = crypto.createHash('sha256').update(input.code).digest('hex');
  const user = await User.findOneAndUpdate({
    _id: req.user.id,
    phone: req.user.phone,
    phoneVerificationTokenHash: tokenHash,
    phoneVerificationExpiresAt: { $gt: new Date() },
    phoneVerificationAttempts: { $lt: 5 }
  }, {
    $set: { phoneVerifiedAt: new Date(), phoneVerificationAttempts: 0 },
    $unset: { phoneVerificationTokenHash: 1, phoneVerificationExpiresAt: 1, phoneVerificationSentAt: 1 }
  }, { new: true }).select('+phoneVerificationTokenHash +phoneVerificationExpiresAt +phoneVerificationAttempts');
  if (!user) {
    await User.updateOne({
      _id: req.user.id,
      phoneVerificationTokenHash: { $exists: true },
      phoneVerificationExpiresAt: { $gt: new Date() },
      phoneVerificationAttempts: { $lt: 5 }
    }, { $inc: { phoneVerificationAttempts: 1 } });
    throw httpError(400, 'Phone verification code is invalid, expired, or has exceeded the attempt limit');
  }
  send(res, 200, 'Phone number verified', { user: publicUser(user) });
}));

router.post('/forgot-password', asyncHandler(async (req, res) => {
  if (env.nodeEnv === 'production' && !isConfigured()) {
    throw httpError(503, 'Email delivery must be configured before production password resets');
  }
  const input = z.object({ email: z.string().email() }).parse(req.body);
  const user = await User.findOne({ email: input.email.toLowerCase() }).select('+resetTokenHash +resetTokenExpiresAt');
  if (user) {
    const token = crypto.randomBytes(32).toString('hex');
    user.resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');
    user.resetTokenExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await user.save();
    if (isConfigured()) {
      await sendAccountEmail({
        to: user.email,
        subject: 'Reset your ShareGrid password',
        text: `Use this one-time code to reset your ShareGrid password: ${token}\nIt expires in 30 minutes.`
      });
    } else if (env.nodeEnv !== 'production') {
      return send(res, 200, 'Password reset token created for development', { resetToken: token });
    } else {
      throw httpError(503, 'Password reset email delivery is unavailable; contact the administrator');
    }
  }
  send(res, 200, 'If the account exists, password reset instructions will be sent');
}));

router.post('/verify-email', asyncHandler(async (req, res) => {
  const input = z.object({ token: z.string().length(64) }).parse(req.body);
  const tokenHash = crypto.createHash('sha256').update(input.token).digest('hex');
  const user = await User.findOne({
    emailVerificationTokenHash: tokenHash,
    emailVerificationExpiresAt: { $gt: new Date() }
  }).select('+emailVerificationTokenHash +emailVerificationExpiresAt');
  if (!user) throw httpError(400, 'Email verification token is invalid or expired');
  user.emailVerifiedAt = new Date();
  user.emailVerificationTokenHash = undefined;
  user.emailVerificationExpiresAt = undefined;
  await user.save();
  send(res, 200, 'Email address verified', { user: publicUser(user) });
}));

router.post('/resend-verification', asyncHandler(async (req, res) => {
  if (env.nodeEnv === 'production' && !isConfigured()) {
    throw httpError(503, 'Email delivery must be configured before production verification');
  }
  const input = z.object({ email: z.string().email() }).parse(req.body);
  const user = await User.findOne({ email: input.email.toLowerCase() })
    .select('+emailVerificationTokenHash +emailVerificationExpiresAt');
  if (!user || user.emailVerifiedAt) return send(res, 200, 'If the account needs verification, instructions will be sent');
  const token = crypto.randomBytes(32).toString('hex');
  user.emailVerificationTokenHash = crypto.createHash('sha256').update(token).digest('hex');
  user.emailVerificationExpiresAt = new Date(Date.now() + env.emailVerificationExpiresHours * 60 * 60 * 1000);
  await user.save();
  if (isConfigured()) {
    await sendAccountEmail({
      to: user.email,
      subject: 'Verify your ShareGrid email',
      text: `Use this one-time code to verify your ShareGrid account: ${token}\nIt expires in ${env.emailVerificationExpiresHours} hours.`
    });
  } else if (env.nodeEnv !== 'production') {
    return send(res, 200, 'Email verification token created for development', { emailVerificationToken: token });
  } else {
    throw httpError(503, 'Email verification delivery is unavailable; contact the administrator');
  }
  send(res, 200, 'If the account needs verification, instructions will be sent');
}));

router.post('/reset-password', asyncHandler(async (req, res) => {
  const input = z.object({ token: z.string().min(32), password: z.string().min(10).max(128) }).parse(req.body);
  const tokenHash = crypto.createHash('sha256').update(input.token).digest('hex');
  const user = await User.findOne({ resetTokenHash: tokenHash, resetTokenExpiresAt: { $gt: new Date() } })
    .select('+resetTokenHash +resetTokenExpiresAt');
  if (!user) throw httpError(400, 'Reset token is invalid or expired');
  user.passwordHash = await bcrypt.hash(input.password, 12);
  user.resetTokenHash = undefined;
  user.resetTokenExpiresAt = undefined;
  user.tokenVersion += 1;
  await user.save();
  send(res, 200, 'Password updated; please sign in again', {});
}));

router.patch('/change-password', authenticate, asyncHandler(async (req, res) => {
  const input = z.object({ currentPassword: z.string(), newPassword: z.string().min(10).max(128) }).parse(req.body);
  const user = await User.findById(req.user.id).select('+passwordHash');
  if (!(await bcrypt.compare(input.currentPassword, user.passwordHash))) throw httpError(400, 'Current password is incorrect');
  user.passwordHash = await bcrypt.hash(input.newPassword, 12);
  user.tokenVersion += 1;
  await user.save();
  send(res, 200, 'Password changed; please sign in again', {});
}));

module.exports = router;
