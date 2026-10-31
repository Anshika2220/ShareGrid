const crypto = require('node:crypto');
const path = require('node:path');
const express = require('express');
const { z } = require('zod');
const { Resource, Verification, VerificationEvidence, Organisation, Membership } = require('../models');
const { authenticate } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const { notify } = require('../services/notifications');
const { send, httpError } = require('../utils/http');
const { upload, validateFileSignature, removeTemporaryFile } = require('../services/privateUploads');
const { storeFile, deleteFile, streamFile } = require('../services/privateStorage');

const router = express.Router();
const uploadRateLimit = require('express-rate-limit')({
  windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false
});
const answersSchema = z.record(z.string(), z.string().max(2000)).refine((value) => Object.keys(value).length >= 4, {
  message: 'Submit the required verification answers before requesting review'
});

router.post('/', authenticate, asyncHandler(async (req, res) => {
  const input = z.object({
    resourceId: z.string().regex(/^[a-f\d]{24}$/i),
    route: z.enum(['invoice', 'no_invoice']),
    answers: answersSchema
  }).parse(req.body);
  const resource = await Resource.findOne({ _id: input.resourceId, owner: req.user.id });
  if (!resource) throw httpError(404, 'Resource not found or not owned by you');
  if (input.route === 'no_invoice' && Object.keys(input.answers).length < 8) {
    throw httpError(400, 'The no-invoice route requires at least eight relevant answers');
  }
  if (resource.ownershipType === 'organisation') {
    const member = await Membership.exists({ organisation: resource.organisation, user: req.user.id, status: 'active', role: { $in: ['owner', 'representative'] } });
    const organisation = await Organisation.findById(resource.organisation);
    if (!member || !organisation || organisation.verificationStatus !== 'approved') {
      throw httpError(400, 'Verify the organisation and authorised representative before submitting its resource');
    }
  }
  const verification = await Verification.findOneAndUpdate(
    { resource: resource.id, applicant: req.user.id },
    { $set: { route: input.route, answers: input.answers, status: 'pending', decisionReason: undefined, reviewer: undefined, reviewedAt: undefined } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );
  resource.verificationStatus = 'pending';
  resource.status = 'draft';
  await resource.save();
  await notify(req.user.id, 'verification_submitted', 'Your resource verification was submitted for review', { verificationId: verification.id });
  send(res, 201, 'Verification submitted', { verification });
}));

router.post('/:id/evidence', authenticate, uploadRateLimit, upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) throw httpError(400, 'Evidence file is required');
  if (!(await validateFileSignature(req.file))) {
    removeTemporaryFile(req.file.path);
    throw httpError(415, 'Evidence file content does not match its declared type');
  }
  const verification = await Verification.findById(req.params.id);
  if (!verification) {
    removeTemporaryFile(req.file.path);
    throw httpError(404, 'Verification not found');
  }
  const resource = await Resource.findById(verification.resource);
  const isAdmin = req.user.roles.includes('admin');
  if (!isAdmin && verification.applicant.toString() !== req.user.id && resource?.owner.toString() !== req.user.id) {
    removeTemporaryFile(req.file.path);
    throw httpError(403, 'You cannot access this verification');
  }
  let kind;
  try {
    kind = z.enum(['invoice', 'live_possession', 'serial_label', 'ownership', 'other'])
      .parse(req.body.kind || 'other');
  } catch (error) {
    removeTemporaryFile(req.file.path);
    throw error;
  }
  let evidence;
  let stored;
  try {
    stored = await storeFile(req.file);
    evidence = await VerificationEvidence.create({
      verification: verification.id,
      uploader: req.user.id,
      originalName: path.basename(req.file.originalname).slice(0, 200),
      ...stored,
      mimeType: req.file.mimetype,
      size: req.file.size,
      kind
    });
    verification.evidence.push(evidence.id);
    await verification.save();
  } catch (error) {
    removeTemporaryFile(req.file.path);
    if (evidence) await VerificationEvidence.deleteOne({ _id: evidence.id });
    if (stored) {
      try {
        await deleteFile(stored.storageProvider, stored.storedName);
      } catch (cleanupError) {
        console.error('Unable to remove evidence after a failed database write', cleanupError);
      }
    }
    throw error;
  }
  send(res, 201, 'Private evidence uploaded', { evidence: { id: evidence.id, kind: evidence.kind, originalName: evidence.originalName, size: evidence.size } });
}));

router.post('/:id/possession-challenge', authenticate, asyncHandler(async (req, res) => {
  const verification = await Verification.findOne({ _id: req.params.id, applicant: req.user.id });
  if (!verification) throw httpError(404, 'Verification not found');
  if (!['pending', 'under_review', 'additional_evidence_required'].includes(verification.status)) throw httpError(409, 'This verification is not accepting possession evidence');
  const code = crypto.randomInt(100000, 1000000).toString();
  verification.challengeHash = crypto.createHash('sha256').update(code).digest('hex');
  verification.challengeExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
  verification.challengeUsedAt = undefined;
  await verification.save();
  send(res, 200, 'One-time possession challenge created', { code, expiresAt: verification.challengeExpiresAt });
}));

router.post('/:id/possession-proof', authenticate, uploadRateLimit, upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) throw httpError(400, 'Live possession photo/video frame is required');
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(req.file.mimetype) || !(await validateFileSignature(req.file))) {
    removeTemporaryFile(req.file.path);
    throw httpError(415, 'Possession proof must be a live image in JPEG, PNG, or WebP format');
  }
  let input;
  try {
    input = z.object({ code: z.string().length(6) }).parse(req.body);
  } catch (error) {
    removeTemporaryFile(req.file.path);
    throw error;
  }
  const verification = await Verification.findOne({ _id: req.params.id, applicant: req.user.id }).select('+challengeHash +challengeExpiresAt');
  if (!verification) {
    removeTemporaryFile(req.file.path);
    throw httpError(404, 'Verification not found');
  }
  const provided = crypto.createHash('sha256').update(input.code).digest('hex');
  const claimed = await Verification.findOneAndUpdate(
    {
      _id: verification.id, applicant: req.user.id, challengeHash: provided,
      challengeExpiresAt: { $gt: new Date() }, challengeUsedAt: { $exists: false }
    },
    { $set: { challengeUsedAt: new Date() }, $unset: { challengeHash: 1 } },
    { new: true }
  );
  if (!claimed) {
    removeTemporaryFile(req.file.path);
    throw httpError(400, 'Possession challenge is invalid, expired, or already used');
  }
  let evidence;
  let stored;
  try {
    stored = await storeFile(req.file);
    evidence = await VerificationEvidence.create({
      verification: verification.id, uploader: req.user.id,
      originalName: path.basename(req.file.originalname).slice(0, 200),
      ...stored, mimeType: req.file.mimetype,
      size: req.file.size, kind: 'live_possession'
    });
    verification.evidence.push(evidence.id);
    await verification.save();
  } catch (error) {
    removeTemporaryFile(req.file.path);
    if (evidence) await VerificationEvidence.deleteOne({ _id: evidence.id });
    if (stored) {
      try {
        await deleteFile(stored.storageProvider, stored.storedName);
      } catch (cleanupError) {
        console.error('Unable to remove possession evidence after a failed database write', cleanupError);
      }
    }
    throw error;
  }
  send(res, 201, 'Possession proof submitted; it still requires human review', { evidenceId: evidence.id });
}));

router.get('/mine', authenticate, asyncHandler(async (req, res) => {
  const items = await Verification.find({ applicant: req.user.id }).populate('resource', 'title verificationStatus').sort({ updatedAt: -1 });
  send(res, 200, 'Your verification requests', { items });
}));

router.get('/evidence/:evidenceId', authenticate, asyncHandler(async (req, res) => {
  const evidence = await VerificationEvidence.findById(req.params.evidenceId).select('+storedName');
  if (!evidence) throw httpError(404, 'Evidence not found');
  const verification = await Verification.findById(evidence.verification);
  const resource = verification && await Resource.findById(verification.resource);
  const allowed = req.user.roles.includes('admin') ||
    evidence.uploader.toString() === req.user.id ||
    verification?.applicant.toString() === req.user.id ||
    resource?.owner.toString() === req.user.id;
  if (!allowed) throw httpError(404, 'Evidence not found');
  await streamFile(res, evidence);
}));

module.exports = router;
