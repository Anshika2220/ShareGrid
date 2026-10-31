const express = require('express');
const mongoose = require('mongoose');
const { z } = require('zod');
const { Booking, Resource, UsageRecord, HandoverRecord } = require('../models');
const { authenticate, requireAdmin } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const { getPolicy } = require('../services/policies');
const { notify } = require('../services/notifications');
const { calculateAmount } = require('../services/businessRules');
const { assertUserCloudinaryImages } = require('../services/cloudinary');
const { send, httpError } = require('../utils/http');

const router = express.Router();
const activeStatuses = ['approved', 'confirmed', 'checked_out'];

function validatePeriod(start, end) {
  if (start >= end) throw httpError(400, 'End date must be after start date');
}

async function checkEligibility(resource, userId, start, end) {
  validatePeriod(start, end);
  const platformPolicy = await getPolicy('fairUse', resource.category);
  const activeCount = await Booking.countDocuments({ seeker: userId, resource: resource.id, status: { $in: activeStatuses } });
  const activeLimits = [platformPolicy?.maxActiveBookings, resource.fairUse?.maxActiveBookings].filter(Number.isFinite);
  const activeLimit = activeLimits.length ? Math.min(...activeLimits) : null;
  if (activeLimit !== null && activeCount >= activeLimit) {
    return { eligible: false, reason: `Resource fair-use policy permits at most ${activeLimit} active booking(s)` };
  }
  const policies = [platformPolicy, resource.fairUse].filter(Boolean);
  for (const policy of policies) {
    if (Number.isFinite(policy.maxUsageDaysPerRollingPeriod) && Number.isFinite(policy.rollingPeriodDays)) {
      const since = new Date(Date.now() - policy.rollingPeriodDays * 86400000);
      const usage = await UsageRecord.aggregate([
        { $match: { user: new mongoose.Types.ObjectId(userId), resource: resource._id, createdAt: { $gte: since } } },
        { $group: { _id: null, days: { $sum: '$days' } } }
      ]);
      const requestedDays = Math.max(1, Math.ceil((end - start) / 86400000));
      if ((usage[0]?.days || 0) + requestedDays > policy.maxUsageDaysPerRollingPeriod) {
        return { eligible: false, reason: `Resource fair-use policy permits ${policy.maxUsageDaysPerRollingPeriod} day(s) in each ${policy.rollingPeriodDays}-day period` };
      }
    }
  }
  return { eligible: true, reason: null };
}

router.get('/mine', authenticate, asyncHandler(async (req, res) => {
  const items = await Booking.find({ $or: [{ seeker: req.user.id }, { provider: req.user.id }] })
    .populate('resource', 'title images category location price pricingUnit').sort({ createdAt: -1 });
  send(res, 200, 'Your bookings', { items });
}));

router.post('/', authenticate, asyncHandler(async (req, res) => {
  const input = z.object({
    resourceId: z.string().regex(/^[a-f\d]{24}$/i), start: z.coerce.date(), end: z.coerce.date(),
    offerId: z.string().regex(/^[a-f\d]{24}$/i).optional()
  }).parse(req.body);
  if (input.start >= input.end || input.start <= new Date()) throw httpError(400, 'Booking dates must be a future, positive time range');
  const resource = await Resource.findOne({ _id: input.resourceId, status: 'active', verificationStatus: 'approved' });
  if (!resource) throw httpError(404, 'Resource is unavailable or not verified');
  if (resource.owner.toString() === req.user.id) throw httpError(400, 'You cannot book your own resource');
  if (resource.availability?.availableFrom && input.start < resource.availability.availableFrom) throw httpError(409, 'Requested start is before availability begins');
  if (resource.availability?.availableUntil && input.end > resource.availability.availableUntil) throw httpError(409, 'Requested end is after availability ends');
  if (resource.availability?.blockedDates?.some(({ start, end }) => start < input.end && end > input.start)) throw httpError(409, 'Requested dates are blocked by the owner');
  const eligibility = await checkEligibility(resource, req.user.id, input.start, input.end);
  if (!eligibility.eligible) throw httpError(403, eligibility.reason);
  let agreedPrice = resource.price;
  let acceptedOffer;
  if (input.offerId) {
    const { Offer } = require('../models');
    const { getPricingRange } = require('../services/policies');
    const { isOfferWithinRange } = require('../services/businessRules');
    acceptedOffer = await Offer.findOne({ _id: input.offerId, status: 'accepted' }).populate('conversation', 'resource participants');
    if (!acceptedOffer || acceptedOffer.conversation.resource.toString() !== resource.id ||
      !acceptedOffer.conversation.participants.some((participant) => participant.toString() === req.user.id) ||
      !acceptedOffer.conversation.participants.some((participant) => participant.toString() === resource.owner.toString())) {
      throw httpError(403, 'The accepted offer does not belong to this resource transaction');
    }
    if (!isOfferWithinRange(acceptedOffer.amount, await getPricingRange(resource))) {
      throw httpError(409, 'Accepted offer no longer fits the current permitted price range');
    }
    agreedPrice = acceptedOffer.amount;
  }
  const totalAmount = calculateAmount(agreedPrice, input.start, input.end, resource.pricingUnit);
  const policy = await getPolicy('inspectionBufferHours', resource.category);
  const bufferHours = Number.isFinite(policy) ? policy : 0;
  if (bufferHours < 0 || bufferHours > 24 * 30) throw httpError(500, 'Configured inspection buffer is invalid');
  const booking = await Booking.create({
    resource: resource.id, seeker: req.user.id, provider: resource.owner,
    start: input.start, end: input.end, inspectionBufferHours: bufferHours,
    pricePerUnit: agreedPrice, pricingUnit: resource.pricingUnit,
    totalAmount,
    depositAmount: resource.deposit.required ? resource.deposit.amount : 0,
    ...(acceptedOffer ? { finalOffer: acceptedOffer.id } : {})
  });
  await notify(resource.owner, 'booking_request', 'A seeker requested your resource', { bookingId: booking.id });
  send(res, 201, 'Booking request sent to provider', { booking });
}));

router.get('/eligibility/:resourceId', authenticate, asyncHandler(async (req, res) => {
  const input = z.object({ start: z.coerce.date(), end: z.coerce.date() }).parse(req.query);
  validatePeriod(input.start, input.end);
  const resource = await Resource.findOne({ _id: req.params.resourceId, status: 'active', verificationStatus: 'approved' });
  if (!resource) throw httpError(404, 'Resource not found');
  const result = await checkEligibility(resource, req.user.id, input.start, input.end);
  send(res, 200, 'Booking eligibility', result);
}));

router.get('/:id/eligibility', authenticate, asyncHandler(async (req, res) => {
  const input = z.object({
    resourceId: z.string().regex(/^[a-f\d]{24}$/i),
    start: z.coerce.date(),
    end: z.coerce.date()
  }).parse(req.query);
  validatePeriod(input.start, input.end);
  const booking = await Booking.findOne({ _id: req.params.id, $or: [{ seeker: req.user.id }, { provider: req.user.id }] });
  if (!booking) throw httpError(404, 'Booking not found');
  const resource = await Resource.findOne({ _id: input.resourceId, status: 'active', verificationStatus: 'approved' });
  if (!resource) throw httpError(404, 'Resource not found');
  const result = await checkEligibility(resource, booking.seeker.toString(), input.start, input.end);
  send(res, 200, 'Booking eligibility', result);
}));

router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id).populate('resource', 'title images location');
  if (!booking || ![booking.seeker.toString(), booking.provider.toString()].includes(req.user.id) && !req.user.roles.includes('admin')) {
    throw httpError(404, 'Booking not found');
  }
  send(res, 200, 'Booking details', { booking });
}));

router.patch('/:id/decision', authenticate, asyncHandler(async (req, res) => {
  const input = z.object({ decision: z.enum(['approve', 'reject']), reason: z.string().max(1000).optional() }).parse(req.body);
  const booking = await Booking.findOne({ _id: req.params.id, provider: req.user.id, status: 'requested' });
  if (!booking) throw httpError(404, 'Pending booking request not found');
  if (input.decision === 'reject') {
    booking.status = 'rejected';
    booking.decisionReason = input.reason;
    await booking.save();
    await notify(booking.seeker, 'booking_rejected', 'Your booking request was declined', { bookingId: booking.id, reason: input.reason });
    return send(res, 200, 'Booking request declined', { booking });
  }
  if (booking.start <= new Date()) throw httpError(409, 'The requested booking period has already started');
  const resource = await Resource.findOne({ _id: booking.resource, owner: req.user.id, status: 'active', verificationStatus: 'approved' });
  if (!resource) throw httpError(409, 'Resource is no longer available for booking');
  if (resource.availability?.availableFrom && booking.start < resource.availability.availableFrom) throw httpError(409, 'Requested dates are no longer available');
  if (resource.availability?.availableUntil && booking.end > resource.availability.availableUntil) throw httpError(409, 'Requested dates are no longer available');
  const blockedUntil = new Date(booking.end.getTime() + booking.inspectionBufferHours * 3600000);
  const noOverlap = { reservations: { $not: { $elemMatch: { start: { $lt: blockedUntil }, blockedUntil: { $gt: booking.start } } } } };
  const noOwnerBlock = { 'availability.blockedDates': { $not: { $elemMatch: { start: { $lt: blockedUntil }, end: { $gt: booking.start } } } } };
  const updatedResource = await Resource.findOneAndUpdate(
    { _id: resource.id, status: 'active', verificationStatus: 'approved', ...noOverlap, ...noOwnerBlock },
    { $push: { reservations: { booking: booking.id, start: booking.start, end: booking.end, blockedUntil } } },
    { new: true }
  );
  if (!updatedResource) throw httpError(409, 'Those dates overlap an existing booking, inspection buffer, or blocked period');
  booking.status = 'approved';
  booking.decisionReason = input.reason;
  await booking.save();
  await notify(booking.seeker, 'booking_approved', 'Your booking request was approved; payment is required to confirm it', { bookingId: booking.id });
  send(res, 200, 'Booking approved; it is not confirmed until payment succeeds', { booking });
}));

router.post('/:id/cancel', authenticate, asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking || ![booking.seeker.toString(), booking.provider.toString()].includes(req.user.id)) throw httpError(404, 'Booking not found');
  if (!['requested', 'approved', 'confirmed'].includes(booking.status)) throw httpError(409, 'This booking can no longer be cancelled');
  if (booking.status === 'checked_out') throw httpError(409, 'A checked-out resource must be returned through the handover workflow');
  if (booking.status === 'confirmed' && booking.paymentStatus === 'paid') {
    throw httpError(409, 'A paid booking requires an administrator refund decision before cancellation');
  }
  booking.status = 'cancelled';
  booking.cancelledBy = req.user.id;
  await booking.save();
  await Resource.updateOne({ _id: booking.resource }, { $pull: { reservations: { booking: booking.id } } });
  await notify(booking.seeker.toString() === req.user.id ? booking.provider : booking.seeker, 'booking_cancelled', 'A booking was cancelled', { bookingId: booking.id });
  send(res, 200, 'Booking cancelled', { booking });
}));

router.post('/:id/check-in', authenticate, asyncHandler(async (req, res) => {
  const input = z.object({
    confirm: z.boolean().default(false), condition: z.string().trim().min(2).max(2000).optional(),
    photos: z.array(z.string().url()).min(1).max(20).optional(),
    accessories: z.array(z.string().max(100)).max(50).optional(), notes: z.string().max(2000).optional()
  }).parse(req.body);
  const booking = await Booking.findById(req.params.id);
  if (!booking || ![booking.seeker.toString(), booking.provider.toString()].includes(req.user.id)) throw httpError(404, 'Booking not found');
  if (input.photos) assertUserCloudinaryImages(input.photos, req.user.id, 'handover');
  if (!['confirmed', 'checked_out'].includes(booking.status)) throw httpError(409, 'Only paid, confirmed bookings can check in');
  if (Date.now() < booking.start.getTime()) throw httpError(409, 'Check-in is not available before the booking start time');
  let record = await HandoverRecord.findOne({ booking: booking.id });
  if (!record) record = await HandoverRecord.create({ booking: booking.id });
  const provider = req.user.id === booking.provider.toString();
  if (record.checkIn?.at) {
    if (!input.confirm) throw httpError(400, 'Send {confirm:true} to acknowledge the existing check-in record');
    const alreadyConfirmed = provider ? record.checkIn.providerConfirmedAt : record.checkIn.seekerConfirmedAt;
    if (alreadyConfirmed) throw httpError(409, 'You have already confirmed this handover');
    if (provider) record.checkIn.providerConfirmedAt = new Date();
    else record.checkIn.seekerConfirmedAt = new Date();
  } else {
    if (!input.condition || !input.photos || !input.accessories) throw httpError(400, 'Initial check-in requires condition, photos, and accessories');
    record.checkIn = {
      ...input, at: new Date(),
      ...(provider ? { providerConfirmedAt: new Date() } : { seekerConfirmedAt: new Date() })
    };
  }
  await record.save();
  booking.status = 'checked_out';
  await booking.save();
  await notify(provider ? booking.seeker : booking.provider, 'handover_checkin', 'Check-in details were recorded or confirmed', { bookingId: booking.id });
  send(res, record.checkIn.providerConfirmedAt && record.checkIn.seekerConfirmedAt ? 200 : 201, 'Check-in recorded or confirmed', { handover: record });
}));

router.post('/:id/check-out', authenticate, asyncHandler(async (req, res) => {
  const input = z.object({
    confirm: z.boolean().default(false), condition: z.string().trim().min(2).max(2000).optional(),
    photos: z.array(z.string().url()).min(1).max(20).optional(),
    accessories: z.array(z.string().max(100)).max(50).optional(),
    missingItems: z.array(z.string().max(100)).max(50).default([]), notes: z.string().max(2000).optional()
  }).parse(req.body);
  const booking = await Booking.findById(req.params.id);
  if (!booking || ![booking.seeker.toString(), booking.provider.toString()].includes(req.user.id)) throw httpError(404, 'Booking not found');
  if (input.photos) assertUserCloudinaryImages(input.photos, req.user.id, 'handover');
  if (!['checked_out', 'returned'].includes(booking.status)) throw httpError(409, 'Check-in must be recorded before return');
  const record = await HandoverRecord.findOne({ booking: booking.id });
  if (!record?.checkIn) throw httpError(409, 'Check-in record is missing');
  if (!record.checkIn.providerConfirmedAt || !record.checkIn.seekerConfirmedAt) {
    throw httpError(409, 'Both parties must confirm check-in before return');
  }
  const now = new Date();
  const provider = req.user.id === booking.provider.toString();
  if (record.checkOut?.at) {
    if (!input.confirm) throw httpError(400, 'Send {confirm:true} to acknowledge the existing return record');
    const alreadyConfirmed = provider ? record.checkOut.providerConfirmedAt : record.checkOut.seekerConfirmedAt;
    if (alreadyConfirmed) throw httpError(409, 'You have already confirmed this return');
    if (provider) record.checkOut.providerConfirmedAt = now;
    else record.checkOut.seekerConfirmedAt = now;
  } else {
    if (provider) throw httpError(403, 'The seeker must submit the return condition before the provider confirms it');
    if (!input.condition || !input.photos || !input.accessories) throw httpError(400, 'Initial return requires condition, photos, and accessories');
    record.checkOut = { ...input, at: now, seekerConfirmedAt: now };
  }
  await record.save();
  booking.status = 'returned';
  await booking.save();
  const blockedUntil = new Date(now.getTime() + booking.inspectionBufferHours * 3600000);
  await Resource.updateOne(
    { _id: booking.resource, 'reservations.booking': booking.id },
    { $max: { 'reservations.$.blockedUntil': blockedUntil } }
  );
  await UsageRecord.updateOne(
    { booking: booking.id },
    { $setOnInsert: {
      booking: booking.id, user: booking.seeker, resource: booking.resource,
      days: Math.max(1, Math.ceil((record.checkOut.at - record.checkIn.at) / 86400000))
    } },
    { upsert: true }
  );
  await notify(booking.provider, 'resource_returned', 'Return has been recorded; inspection buffer applies before availability resumes', { bookingId: booking.id });
  send(res, record.checkOut.providerConfirmedAt && record.checkOut.seekerConfirmedAt ? 200 : 201, 'Return recorded or confirmed; inspect the resource before completing the booking', { handover: record, inspectionBufferHours: booking.inspectionBufferHours });
}));

router.get('/:id/handover', authenticate, asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking || ![booking.seeker.toString(), booking.provider.toString()].includes(req.user.id) && !req.user.roles.includes('admin')) {
    throw httpError(404, 'Booking not found');
  }
  const handover = await HandoverRecord.findOne({ booking: booking.id });
  send(res, 200, 'Handover record', { handover });
}));

router.get('/:id/deposit', authenticate, asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking || ![booking.seeker.toString(), booking.provider.toString()].includes(req.user.id) && !req.user.roles.includes('admin')) {
    throw httpError(404, 'Booking not found');
  }
  const { DepositTransaction } = require('../models');
  const transactions = await DepositTransaction.find({ booking: booking.id }).sort({ createdAt: 1 });
  send(res, 200, 'Booking deposit ledger', { bookingId: booking.id, requiredAmount: booking.depositAmount, transactions });
}));

router.post('/:id/complete-inspection', authenticate, asyncHandler(async (req, res) => {
  const input = z.object({ reason: z.string().trim().min(3).max(1000) }).parse(req.body);
  const booking = await Booking.findOne({ _id: req.params.id, provider: req.user.id, status: 'returned' });
  if (!booking) throw httpError(404, 'Returned booking not found');
  const handover = await HandoverRecord.findOne({ booking: booking.id });
  if (!handover?.checkOut?.providerConfirmedAt || !handover.checkOut.seekerConfirmedAt) {
    throw httpError(409, 'Both parties must confirm the return before inspection can be completed');
  }
  if (Date.now() < handover.checkOut.at.getTime() + booking.inspectionBufferHours * 3600000) throw httpError(409, 'The configured inspection buffer has not elapsed');
  booking.status = 'completed';
  await booking.save();
  await Resource.updateOne({ _id: booking.resource }, { $pull: { reservations: { booking: booking.id } } });
  const policy = await getPolicy('honorScore');
  const delta = Number(policy?.positiveCompletion || 0);
  if (delta) {
    const { User, HonorScoreHistory } = require('../models');
    for (const participantId of [booking.seeker, booking.provider]) {
      const participant = await User.findById(participantId);
      const before = participant.honorScore;
      participant.honorScore = Math.max(0, Math.min(100, participant.honorScore + delta));
      await participant.save();
      await HonorScoreHistory.create({
        user: participant.id, booking: booking.id,
        delta: participant.honorScore - before, reason: input.reason
      });
    }
  }
  await notify(booking.seeker, 'booking_completed', 'The transaction is complete; you can now review each other', { bookingId: booking.id });
  send(res, 200, 'Inspection completed; booking is complete', { booking });
}));

module.exports = router;
