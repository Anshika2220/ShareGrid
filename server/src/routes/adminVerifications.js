const express = require('express');
const { z } = require('zod');
const { Verification, VerificationEvidence, Resource, AuditLog } = require('../models');
const { authenticate, requireAdmin } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const { notify } = require('../services/notifications');
const { send, httpError } = require('../utils/http');

const router = express.Router();
router.use(authenticate, requireAdmin);

router.get('/', asyncHandler(async (req, res) => {
  const items = await Verification.find({ status: { $in: ['pending', 'under_review', 'additional_evidence_required'] } })
    .populate('resource applicant', 'title name email').sort({ createdAt: 1 });
  send(res, 200, 'Verification review queue', { items });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const verification = await Verification.findById(req.params.id).populate('resource applicant evidence');
  if (!verification) throw httpError(404, 'Verification not found');
  send(res, 200, 'Verification details', { verification });
}));

router.patch('/:id/decision', asyncHandler(async (req, res) => {
  const input = z.object({
    decision: z.enum(['approve', 'reject', 'request_evidence', 'under_review']),
    reason: z.string().trim().min(5).max(2000)
  }).parse(req.body);
  const verification = await Verification.findById(req.params.id);
  if (!verification) throw httpError(404, 'Verification not found');
  const resource = await Resource.findById(verification.resource);
  if (!resource) throw httpError(409, 'Associated resource no longer exists');
  if (input.decision === 'approve') {
    const requiredKind = verification.route === 'invoice' ? 'invoice' : 'live_possession';
    const requiredEvidence = await VerificationEvidence.exists({
      verification: verification.id, kind: requiredKind
    });
    if (!requiredEvidence) throw httpError(409, `Cannot approve without ${requiredKind.replace(/_/g, ' ')} evidence`);
  }
  const statusMap = { approve: 'approved', reject: 'rejected', request_evidence: 'additional_evidence_required', under_review: 'under_review' };
  const previous = verification.status;
  verification.status = statusMap[input.decision];
  verification.decisionReason = input.reason;
  verification.reviewer = req.user.id;
  verification.reviewedAt = new Date();
  resource.verificationStatus = verification.status;
  if (input.decision === 'approve') resource.status = 'active';
  else if (resource.status === 'active') resource.status = 'draft';
  await Promise.all([verification.save(), resource.save()]);
  await AuditLog.create({
    actor: req.user.id, action: `verification.${input.decision}`,
    targetType: 'Verification', targetId: verification.id, reason: input.reason,
    before: { status: previous }, after: { status: verification.status }
  });
  await notify(verification.applicant, 'verification_decision', `Verification ${verification.status.replace(/_/g, ' ')}`, { verificationId: verification.id, reason: input.reason });
  send(res, 200, 'Verification decision recorded', { verification });
}));

module.exports = router;
