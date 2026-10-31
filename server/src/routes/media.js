const express = require('express');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const { authenticate } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const { createUploadSignature } = require('../services/cloudinary');
const { send } = require('../utils/http');

const router = express.Router();
const signatureRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false
});

router.post('/signature', authenticate, signatureRateLimit, asyncHandler(async (req, res) => {
  const input = z.object({ purpose: z.enum(['resource', 'handover']) }).strict().parse(req.body);
  const upload = createUploadSignature(req.user.id, input.purpose);
  send(res, 200, 'Signed Cloudinary upload parameters', { upload });
}));

module.exports = router;
