const express = require('express');
const { z } = require('zod');
const { Resource, Organisation, Membership, Review } = require('../models');
const { authenticate } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const { getPricingRange } = require('../services/policies');
const { send, httpError } = require('../utils/http');
const { resourceInput, resourcePatchInput, toResourceData } = require('../validators/resource');

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const query = z.object({
    category: z.string().optional(), city: z.string().optional(), q: z.string().trim().max(100).optional(),
    page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20)
  }).parse(req.query);
  const filter = { status: 'active', verificationStatus: 'approved' };
  if (query.category) filter.category = query.category;
  if (query.city) filter['location.city'] = new RegExp(`^${query.city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
  if (query.q) filter.$text = { $search: query.q };
  const [items, total] = await Promise.all([
    Resource.find(filter).select('-reservations').sort(query.q ? { score: { $meta: 'textScore' } } : { createdAt: -1 })
      .skip((query.page - 1) * query.limit).limit(query.limit).populate('owner', 'name honorScore averageRating'),
    Resource.countDocuments(filter)
  ]);
  send(res, 200, 'Resources found', { items, pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) } });
}));

router.get('/mine', authenticate, asyncHandler(async (req, res) => {
  const items = await Resource.find({ owner: req.user.id }).select('-reservations').sort({ createdAt: -1 });
  send(res, 200, 'Your resources', { items });
}));

router.post('/', authenticate, asyncHandler(async (req, res) => {
  const input = toResourceData(resourceInput.parse(req.body));
  if (input.ownershipType === 'organisation') {
    if (!input.organisation) throw httpError(400, 'Organisation ownership requires an organisation');
    const membership = await Membership.findOne({ organisation: input.organisation, user: req.user.id, status: 'active', role: { $in: ['owner', 'representative'] } });
    if (!membership) throw httpError(403, 'You are not authorised to list resources for this organisation');
    const organisation = await Organisation.findById(input.organisation);
    if (!organisation || organisation.verificationStatus !== 'approved') throw httpError(400, 'The organisation must be verified before listing assets');
  }
  const resource = await Resource.create({ ...input, owner: req.user.id, status: 'draft', verificationStatus: 'unverified' });
  send(res, 201, 'Resource created as a draft; submit ownership verification before publishing', { resource });
}));

router.get('/:id/availability', asyncHandler(async (req, res) => {
  const resource = await Resource.findOne({ _id: req.params.id, status: 'active', verificationStatus: 'approved' }).select('availability reservations');
  if (!resource) throw httpError(404, 'Resource not found');
  const reservations = resource.reservations.map(({ start, end, blockedUntil }) => ({ start, end, blockedUntil }));
  send(res, 200, 'Resource availability', { availability: resource.availability, occupied: reservations });
}));

router.get('/:id/reviews', asyncHandler(async (req, res) => {
  const resource = await Resource.findById(req.params.id).select('_id');
  if (!resource) throw httpError(404, 'Resource not found');
  const items = await Review.find({ resource: resource.id, moderationStatus: 'visible' })
    .populate('reviewer', 'name').sort({ createdAt: -1 }).limit(100);
  send(res, 200, 'Resource reviews', { items });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const resource = await Resource.findOne({ _id: req.params.id, status: 'active', verificationStatus: 'approved' })
    .select('-reservations').populate('owner', 'name honorScore averageRating ratingCount');
  if (!resource) throw httpError(404, 'Resource not found');
  const range = await getPricingRange(resource);
  send(res, 200, 'Resource details', { resource, permittedPriceRange: range });
}));

router.patch('/:id', authenticate, asyncHandler(async (req, res) => {
  const resource = await Resource.findOne({ _id: req.params.id, owner: req.user.id });
  if (!resource) throw httpError(404, 'Resource not found');
  const input = toResourceData(resourcePatchInput.parse(req.body), resource.deposit);
  if (resource.reservations.length && (input.price !== undefined || input.pricingUnit !== undefined)) {
    throw httpError(409, 'Price terms cannot be changed while resource reservations exist');
  }
  if (input.price !== undefined || input.pricingUnit !== undefined) {
    const { Conversation, Offer } = require('../models');
    const conversations = await Conversation.find({ resource: resource.id }).select('_id');
    if (conversations.length && await Offer.exists({
      conversation: { $in: conversations.map((conversation) => conversation.id) },
      status: { $in: ['pending', 'accepted', 'countered'] }
    })) {
      throw httpError(409, 'Price terms cannot change while negotiation offers are active or accepted');
    }
  }
  if (input.organisation && input.ownershipType === 'organisation') {
    const membership = await Membership.exists({ organisation: input.organisation, user: req.user.id, status: 'active', role: { $in: ['owner', 'representative'] } });
    if (!membership) throw httpError(403, 'You are not authorised for this organisation');
  }
  const identityFields = ['title', 'category', 'brand', 'model', 'images', 'ownershipType', 'organisation'];
  const identityChanged = identityFields.some((field) => input[field] !== undefined &&
    JSON.stringify(input[field]) !== JSON.stringify(resource[field]));
  if (input.location) input.location = { ...resource.location, ...input.location };
  if (input.deposit) input.deposit = { ...resource.deposit, ...input.deposit };
  if (input.availability) {
    input.availability = { ...resource.availability, ...input.availability };
    if (input.availability.availableFrom && input.availability.availableUntil && input.availability.availableFrom >= input.availability.availableUntil ||
      (input.availability.blockedDates || []).some(({ start, end }) => start >= end)) {
      throw httpError(400, 'Availability windows and blocked date ranges must have a positive duration');
    }
  }
  if (input.fairUse) {
    input.fairUse = { ...resource.fairUse, ...input.fairUse };
    if ((input.fairUse.maxUsageDaysPerRollingPeriod === undefined) !== (input.fairUse.rollingPeriodDays === undefined)) {
      throw httpError(400, 'Usage-day limit and rolling-period length must be configured together');
    }
  }
  Object.assign(resource, input);
  if (identityChanged) {
    resource.verificationStatus = 'unverified';
    resource.status = 'draft';
  }
  if (resource.status === 'active' && resource.verificationStatus !== 'approved') resource.status = 'draft';
  await resource.save();
  send(res, 200, 'Resource updated', { resource });
}));

router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  const resource = await Resource.findOne({ _id: req.params.id, owner: req.user.id });
  if (!resource) throw httpError(404, 'Resource not found');
  if (resource.reservations.length) throw httpError(409, 'A resource with active reservations cannot be removed');
  resource.status = 'removed';
  await resource.save();
  send(res, 200, 'Resource removed', {});
}));

router.patch('/:id/status', authenticate, asyncHandler(async (req, res) => {
  const input = z.object({ status: z.enum(['active', 'paused']) }).parse(req.body);
  const resource = await Resource.findOne({ _id: req.params.id, owner: req.user.id });
  if (!resource) throw httpError(404, 'Resource not found');
  if (input.status === 'active' && resource.verificationStatus !== 'approved') throw httpError(409, 'Only approved resources can be activated');
  resource.status = input.status;
  await resource.save();
  send(res, 200, 'Resource status updated', { status: resource.status });
}));

module.exports = router;
