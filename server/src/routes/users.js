const express = require('express');
const { z } = require('zod');
const { User, Review } = require('../models');
const { authenticate } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const { send, httpError } = require('../utils/http');

const router = express.Router();

router.get('/me', authenticate, (req, res) => send(res, 200, 'Current profile', {
  user: {
    id: req.user.id, name: req.user.name, email: req.user.email,
    phone: req.user.phone, profile: req.user.profile,
    honorScore: req.user.honorScore, averageRating: req.user.averageRating, ratingCount: req.user.ratingCount
  }
}));

router.patch('/me', authenticate, asyncHandler(async (req, res) => {
  const input = z.object({
    name: z.string().trim().min(1).max(100).optional(),
    phone: z.string().trim().max(30).optional(),
    profile: z.object({
      bio: z.string().max(500).optional(),
      avatarUrl: z.string().url().optional(),
      location: z.string().max(200).optional(),
      accountType: z.enum(['individual', 'business', 'institution']).optional()
    }).optional()
  }).strict().parse(req.body);
  const user = await User.findById(req.user.id);
  if (input.name !== undefined) user.name = input.name;
  if (input.phone !== undefined) user.phone = input.phone;
  if (input.profile) user.profile = { ...user.profile, ...input.profile };
  await user.save();
  send(res, 200, 'Profile updated', { user: { id: user.id, name: user.name, email: user.email, phone: user.phone, profile: user.profile } });
}));

router.get('/:id/public-profile', asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, status: 'active' })
    .select('name profile honorScore averageRating ratingCount createdAt');
  if (!user) throw httpError(404, 'User not found');
  const recentReviews = await Review.find({ recipient: user.id, moderationStatus: 'visible' })
    .select('rating text reviewer resource createdAt').populate('reviewer', 'name').populate('resource', 'title')
    .sort({ createdAt: -1 }).limit(10);
  send(res, 200, 'Public profile', { user, recentReviews });
}));

module.exports = router;
