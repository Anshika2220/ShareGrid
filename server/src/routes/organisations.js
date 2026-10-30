const path = require('node:path');
const express = require('express');
const { z } = require('zod');
const {
  Organisation, OrganisationEvidence, Membership, User, AuditLog
} = require('../models');
const { authenticate, requireAdmin } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const env = require('../config/env');
const { upload, validateFileSignature, removeTemporaryFile } = require('../services/privateUploads');
const { notify } = require('../services/notifications');
const { send, httpError } = require('../utils/http');

const router = express.Router();
const adminRouter = express.Router();
const uploadRateLimit = require('express-rate-limit')({
  windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false
});

router.post('/', authenticate, asyncHandler(async (req, res) => {
  const input = z.object({
    name: z.string().trim().min(2).max(200),
    type: z.enum(['business', 'institution', 'nonprofit', 'other']),
    registrationNumber: z.string().max(100).optional()
  }).parse(req.body);
  const organisation = await Organisation.create({ ...input, createdBy: req.user.id });
  await Membership.create({ organisation: organisation.id, user: req.user.id, role: 'owner', status: 'active' });
  send(res, 201, 'Organisation created; submit evidence for verification', { organisation });
}));

router.get('/mine', authenticate, asyncHandler(async (req, res) => {
  const memberships = await Membership.find({ user: req.user.id, status: 'active' })
    .populate('organisation').sort({ createdAt: -1 });
  send(res, 200, 'Your organisation memberships', { items: memberships });
}));

router.post('/:id/members', authenticate, asyncHandler(async (req, res) => {
  const input = z.object({
    email: z.string().email().transform((value) => value.toLowerCase()),
    role: z.enum(['representative', 'member'])
  }).parse(req.body);
  const organisation = await Organisation.findById(req.params.id);
  if (!organisation) throw httpError(404, 'Organisation not found');
  const owner = await Membership.exists({
    organisation: organisation.id, user: req.user.id, role: 'owner', status: 'active'
  });
  if (!owner) throw httpError(403, 'Only the organisation owner can manage representatives');
  const member = await User.findOne({ email: input.email, status: 'active' }).select('_id');
  if (!member) throw httpError(404, 'An active ShareGrid account with that email was not found');
  const membership = await Membership.findOneAndUpdate(
    { organisation: organisation.id, user: member.id },
    { $set: { role: input.role, status: 'active' } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  ).populate('user', 'name email');
  send(res, 200, 'Organisation membership saved', { membership });
}));

router.delete('/:id/members/:userId', authenticate, asyncHandler(async (req, res) => {
  const owner = await Membership.exists({
    organisation: req.params.id, user: req.user.id, role: 'owner', status: 'active'
  });
  if (!owner) throw httpError(403, 'Only the organisation owner can manage representatives');
  if (req.params.userId === req.user.id) throw httpError(400, 'The organisation owner membership cannot be revoked');
  const membership = await Membership.findOneAndUpdate(
    { organisation: req.params.id, user: req.params.userId, status: 'active' },
    { $set: { status: 'revoked' } },
    { new: true }
  );
  if (!membership) throw httpError(404, 'Active organisation membership not found');
  send(res, 200, 'Organisation membership revoked', {});
}));

router.post('/:id/evidence', authenticate, uploadRateLimit, upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) throw httpError(400, 'Evidence file is required');
  if (!(await validateFileSignature(req.file))) {
    removeTemporaryFile(req.file.path);
    throw httpError(415, 'Evidence file content does not match its declared type');
  }
  const organisation = await Organisation.findById(req.params.id);
  if (!organisation) {
    removeTemporaryFile(req.file.path);
    throw httpError(404, 'Organisation not found');
  }
  const membership = await Membership.exists({
    organisation: organisation.id, user: req.user.id, status: 'active', role: { $in: ['owner', 'representative'] }
  });
  if (!membership && !req.user.roles.includes('admin')) {
    removeTemporaryFile(req.file.path);
    throw httpError(403, 'Only an authorised organisation representative can upload evidence');
  }
  let kind;
  try {
    kind = z.enum(['registration_document', 'authorisation', 'asset_register', 'other'])
      .parse(req.body.kind);
  } catch (error) {
    removeTemporaryFile(req.file.path);
    throw error;
  }
  const evidence = await OrganisationEvidence.create({
    organisation: organisation.id, uploader: req.user.id,
    originalName: path.basename(req.file.originalname).slice(0, 200),
    storedName: path.basename(req.file.filename), mimeType: req.file.mimetype,
    size: req.file.size, kind
  });
  await notify(organisation.createdBy, 'organisation_evidence', 'Organisation verification evidence was submitted', { organisationId: organisation.id });
  send(res, 201, 'Private organisation evidence uploaded', {
    evidence: { id: evidence.id, kind: evidence.kind, originalName: evidence.originalName, size: evidence.size }
  });
}));

router.get('/evidence/:evidenceId', authenticate, asyncHandler(async (req, res) => {
  const evidence = await OrganisationEvidence.findById(req.params.evidenceId).select('+storedName');
  if (!evidence) throw httpError(404, 'Evidence not found');
  const membership = await Membership.exists({
    organisation: evidence.organisation, user: req.user.id, status: 'active', role: { $in: ['owner', 'representative'] }
  });
  if (!membership && evidence.uploader.toString() !== req.user.id && !req.user.roles.includes('admin')) {
    throw httpError(404, 'Evidence not found');
  }
  const root = path.resolve(env.privateUploadDir);
  const filePath = path.resolve(root, evidence.storedName);
  if (!filePath.startsWith(root + path.sep)) throw httpError(404, 'Evidence not found');
  res.type(evidence.mimeType);
  res.set('Cache-Control', 'private, no-store');
  res.set('Content-Disposition', `inline; filename="${path.basename(evidence.originalName).replace(/["\\]/g, '')}"`);
  res.sendFile(filePath);
}));

adminRouter.use(authenticate, requireAdmin);

adminRouter.get('/queue', asyncHandler(async (req, res) => {
  const items = await Organisation.find({ verificationStatus: { $in: ['pending', 'under_review', 'additional_evidence_required'] } })
    .populate('createdBy', 'name email').sort({ createdAt: 1 });
  send(res, 200, 'Organisation review queue', { items });
}));

adminRouter.get('/:id', asyncHandler(async (req, res) => {
  const organisation = await Organisation.findById(req.params.id).populate('createdBy reviewer', 'name email');
  if (!organisation) throw httpError(404, 'Organisation not found');
  const evidence = await OrganisationEvidence.find({ organisation: organisation.id })
    .select('originalName mimeType size kind uploader createdAt');
  send(res, 200, 'Organisation review details', { organisation, evidence });
}));

adminRouter.patch('/:id/decision', asyncHandler(async (req, res) => {
  const input = z.object({
    decision: z.enum(['approve', 'reject', 'request_evidence', 'under_review']),
    reason: z.string().trim().min(5).max(2000)
  }).parse(req.body);
  const organisation = await Organisation.findById(req.params.id);
  if (!organisation) throw httpError(404, 'Organisation not found');
  if (input.decision === 'approve') {
    const evidence = await OrganisationEvidence.exists({
      organisation: organisation.id,
      kind: { $in: ['registration_document', 'authorisation'] }
    });
    if (!evidence) throw httpError(409, 'Cannot approve without registration or representative authorisation evidence');
  }
  const statusMap = { approve: 'approved', reject: 'rejected', request_evidence: 'additional_evidence_required', under_review: 'under_review' };
  const before = organisation.verificationStatus;
  organisation.verificationStatus = statusMap[input.decision];
  organisation.decisionReason = input.reason;
  organisation.reviewer = req.user.id;
  organisation.reviewedAt = new Date();
  await organisation.save();
  await AuditLog.create({
    actor: req.user.id, action: `organisation.${input.decision}`,
    targetType: 'Organisation', targetId: organisation.id, reason: input.reason,
    before: { verificationStatus: before }, after: { verificationStatus: organisation.verificationStatus }
  });
  await notify(organisation.createdBy, 'organisation_verification', `Organisation verification ${organisation.verificationStatus.replace(/_/g, ' ')}`, { organisationId: organisation.id, reason: input.reason });
  send(res, 200, 'Organisation review decision recorded', { organisation });
}));

module.exports = { router, adminRouter };
