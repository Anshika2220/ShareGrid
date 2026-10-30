const crypto = require('node:crypto');
const express = require('express');
const { z } = require('zod');
const {
  Booking, Resource, Conversation, Message, Offer, Payment, Review, User,
  Incident, PlatformPolicy, AuditLog, HonorScoreHistory, DepositTransaction
} = require('../models');
const { authenticate, requireAdmin } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const env = require('../config/env');
const { getPolicy, getPricingRange, DEFAULTS } = require('../services/policies');
const { notify } = require('../services/notifications');
const { send, httpError } = require('../utils/http');
const { isOfferWithinRange, countWords } = require('../services/businessRules');

const router = express.Router();
const id = z.string().regex(/^[a-f\d]{24}$/i);

async function getConversationForUser(conversationId, userId) {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation || !conversation.participants.some((participant) => participant.toString() === userId)) {
    throw httpError(404, 'Conversation not found');
  }
  return conversation;
}

async function notifyAdmins(type, message, data) {
  const admins = await User.find({ roles: 'admin', status: 'active' }).select('_id');
  await Promise.all(admins.map((admin) => notify(admin.id, type, message, data)));
}

router.post('/conversations', authenticate, asyncHandler(async (req, res) => {
  const input = z.object({ resourceId: id }).parse(req.body);
  const resource = await Resource.findOne({ _id: input.resourceId, status: 'active', verificationStatus: 'approved' });
  if (!resource) throw httpError(404, 'Resource not found');
  if (resource.owner.toString() === req.user.id) throw httpError(400, 'A provider cannot start a conversation with themselves');
  const participants = [resource.owner, req.user.id].sort((a, b) => a.toString().localeCompare(b.toString()));
  const conversation = await Conversation.findOneAndUpdate(
    { resource: resource.id, participants },
    { $setOnInsert: { resource: resource.id, participants, status: 'active' } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  send(res, 201, 'Resource conversation ready', { conversation });
}));

router.patch('/conversations/:id/block', authenticate, asyncHandler(async (req, res) => {
  const conversation = await getConversationForUser(req.params.id, req.user.id);
  conversation.status = 'blocked';
  await conversation.save();
  send(res, 200, 'Conversation blocked; further messages and offers are disabled', { conversationId: conversation.id, status: conversation.status });
}));

router.get('/conversations', authenticate, asyncHandler(async (req, res) => {
  const items = await Conversation.find({ participants: req.user.id }).populate('resource', 'title images owner').sort({ updatedAt: -1 });
  send(res, 200, 'Your conversations', { items });
}));

router.get('/conversations/:id', authenticate, asyncHandler(async (req, res) => {
  const conversation = await getConversationForUser(req.params.id, req.user.id);
  const messages = await Message.find({ conversation: conversation.id }).sort({ createdAt: 1 }).limit(200);
  const offers = await Offer.find({ conversation: conversation.id }).sort({ createdAt: 1 });
  send(res, 200, 'Conversation', { conversation, messages, offers });
}));

router.post('/conversations/:id/messages', authenticate, asyncHandler(async (req, res) => {
  const input = z.object({ body: z.string().trim().min(1).max(2000) }).parse(req.body);
  const conversation = await getConversationForUser(req.params.id, req.user.id);
  if (conversation.status !== 'active') throw httpError(409, 'This conversation is not active');
  const policy = await getPolicy('negotiation');
  if (Number.isFinite(policy?.maxMessages)) {
    const count = await Message.countDocuments({ conversation: conversation.id });
    if (count >= policy.maxMessages) throw httpError(429, 'The message limit for this conversation has been reached');
  }
  const message = await Message.create({ conversation: conversation.id, sender: req.user.id, body: input.body });
  const recipient = conversation.participants.find((participant) => participant.toString() !== req.user.id);
  await notify(recipient, 'new_message', 'You received a resource-related message', { conversationId: conversation.id });
  send(res, 201, 'Message sent', { message });
}));

router.post('/conversations/:id/report', authenticate, asyncHandler(async (req, res) => {
  const input = z.object({ messageId: id, reason: z.string().trim().min(3).max(1000) }).parse(req.body);
  const conversation = await getConversationForUser(req.params.id, req.user.id);
  const message = await Message.findOne({ _id: input.messageId, conversation: conversation.id });
  if (!message) throw httpError(404, 'Message not found');
  message.reportedAt = new Date();
  message.reportedBy = req.user.id;
  message.reportReason = input.reason;
  await message.save();
  await notifyAdmins('message_report', 'A conversation message was reported', { messageId: message.id, reason: input.reason });
  send(res, 200, 'Message report submitted', {});
}));

router.post('/conversations/:id/offers', authenticate, asyncHandler(async (req, res) => {
  const input = z.object({ amount: z.number().positive(), bookingId: id.optional() }).parse(req.body);
  const conversation = await getConversationForUser(req.params.id, req.user.id);
  if (conversation.status !== 'active') throw httpError(409, 'This conversation is not active');
  if (conversation.finalOffer || await Offer.exists({ conversation: conversation.id, status: 'accepted' })) {
    throw httpError(409, 'A final agreed price already exists for this conversation');
  }
  const resource = await Resource.findById(conversation.resource);
  if (!resource) throw httpError(404, 'Resource not found');
  if (input.bookingId) {
    const booking = await Booking.findOne({ _id: input.bookingId, resource: resource.id, $or: [{ seeker: req.user.id }, { provider: req.user.id }] });
    if (!booking) throw httpError(404, 'Booking does not belong to this resource transaction');
  }
  const range = await getPricingRange(resource);
  if (!isOfferWithinRange(input.amount, range)) {
    throw httpError(400, `Offer must be within the permitted range of ${range.minimum}–${range.maximum}`);
  }
  const policy = await getPolicy('negotiation');
  if (Number.isFinite(policy?.maxOffers)) {
    const count = await Offer.countDocuments({ conversation: conversation.id });
    if (count >= policy.maxOffers) throw httpError(429, 'The offer limit for this conversation has been reached');
  }
  const expiresAt = Number.isFinite(policy?.expiresInHours) && policy.expiresInHours > 0
    ? new Date(Date.now() + policy.expiresInHours * 3600000) : undefined;
  const offer = await Offer.create({
    conversation: conversation.id,
    booking: input.bookingId,
    offeredBy: req.user.id,
    amount: input.amount,
    expiresAt
  });
  const recipient = conversation.participants.find((participant) => participant.toString() !== req.user.id);
  await notify(recipient, 'new_offer', 'You received a price offer', { offerId: offer.id });
  send(res, 201, 'Offer submitted', { offer, permittedPriceRange: range });
}));

router.post('/offers/:id/counter', authenticate, asyncHandler(async (req, res) => {
  const input = z.object({ amount: z.number().positive() }).parse(req.body);
  const previous = await Offer.findById(req.params.id);
  if (!previous || previous.status !== 'pending') throw httpError(404, 'Pending offer not found');
  const conversation = await getConversationForUser(previous.conversation, req.user.id);
  if (conversation.finalOffer || await Offer.exists({ conversation: conversation.id, status: 'accepted' })) {
    throw httpError(409, 'A final agreed price already exists for this conversation');
  }
  if (previous.offeredBy.toString() === req.user.id) throw httpError(403, 'Only the other participant can counter this offer');
  if (previous.expiresAt && previous.expiresAt < new Date()) {
    previous.status = 'expired';
    await previous.save();
    throw httpError(409, 'Offer has expired');
  }
  const resource = await Resource.findById(conversation.resource);
  const range = await getPricingRange(resource);
  if (!isOfferWithinRange(input.amount, range)) throw httpError(400, 'Counteroffer is outside the permitted price range');
  const policy = await getPolicy('negotiation');
  if (Number.isFinite(policy?.maxOffers) && await Offer.countDocuments({ conversation: conversation.id }) >= policy.maxOffers) {
    throw httpError(429, 'The offer limit for this conversation has been reached');
  }
  const countered = await Offer.findOneAndUpdate(
    { _id: previous.id, status: 'pending' },
    { $set: { status: 'countered' } },
    { new: true }
  );
  if (!countered) throw httpError(409, 'Offer state changed; refresh the conversation');
  await Offer.updateMany({ conversation: conversation.id, status: 'pending' }, { $set: { status: 'rejected' } });
  const expiresAt = Number.isFinite(policy?.expiresInHours) && policy.expiresInHours > 0
    ? new Date(Date.now() + policy.expiresInHours * 3600000) : undefined;
  const offer = await Offer.create({
    conversation: conversation.id, booking: previous.booking, offeredBy: req.user.id,
    amount: input.amount, parentOffer: previous.id, expiresAt
  });
  const recipient = conversation.participants.find((participant) => participant.toString() !== req.user.id);
  await notify(recipient, 'offer_countered', 'Your offer received a counteroffer', { offerId: offer.id });
  send(res, 201, 'Counteroffer submitted', { offer });
}));

router.patch('/offers/:id/accept', authenticate, asyncHandler(async (req, res) => {
  const offer = await Offer.findById(req.params.id);
  if (!offer || offer.status !== 'pending') throw httpError(404, 'Pending offer not found');
  const conversation = await getConversationForUser(offer.conversation, req.user.id);
  if (offer.offeredBy.toString() === req.user.id) throw httpError(403, 'The offer author cannot accept their own offer');
  if (await Offer.exists({ conversation: conversation.id, status: 'accepted' })) throw httpError(409, 'A final agreed price already exists for this conversation');
  if (offer.expiresAt && offer.expiresAt < new Date()) {
    offer.status = 'expired';
    await offer.save();
    throw httpError(409, 'Offer has expired');
  }
  const reservation = await Conversation.findOneAndUpdate(
    { _id: conversation.id, status: 'active', finalOffer: { $exists: false } },
    { $set: { finalOffer: offer.id } },
    { new: true }
  );
  if (!reservation) throw httpError(409, 'Another final offer has already been accepted');
  const accepted = await Offer.findOneAndUpdate(
    { _id: offer.id, status: 'pending', $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: new Date() } }] },
    { $set: { status: 'accepted' } },
    { new: true }
  );
  if (!accepted) {
    await Conversation.updateOne({ _id: conversation.id, finalOffer: offer.id }, { $unset: { finalOffer: 1 } });
    throw httpError(409, 'Offer state changed or expired; refresh the conversation');
  }
  const updatedOffer = accepted;
  await Offer.updateMany({ conversation: conversation.id, _id: { $ne: offer.id }, status: 'pending' }, { $set: { status: 'rejected' } });
  await notify(offer.offeredBy, 'offer_accepted', 'Your price offer was accepted', { offerId: offer.id, amount: offer.amount });
  send(res, 200, 'Offer accepted; this agreed price can be used for a booking request', { offer: updatedOffer });
}));

router.patch('/offers/:id/reject', authenticate, asyncHandler(async (req, res) => {
  const offer = await Offer.findById(req.params.id);
  if (!offer || offer.status !== 'pending') throw httpError(404, 'Pending offer not found');
  const conversation = await getConversationForUser(offer.conversation, req.user.id);
  if (offer.offeredBy.toString() === req.user.id) throw httpError(403, 'The offer author cannot reject their own offer');
  offer.status = 'rejected';
  await offer.save();
  await notify(offer.offeredBy, 'offer_rejected', 'Your price offer was declined', { offerId: offer.id });
  send(res, 200, 'Offer rejected', { offer });
}));

async function razorpayRequest(url, method, body) {
  const credentials = Buffer.from(`${env.razorpayKeyId}:${env.razorpayKeySecret}`).toString('base64');
  const response = await fetch(url, {
    method,
    headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await response.json();
  if (!response.ok) throw httpError(502, payload.error?.description || 'Payment provider request failed');
  return payload;
}

router.post('/payments/create-order', authenticate, asyncHandler(async (req, res) => {
  const input = z.object({ bookingId: id }).parse(req.body);
  const booking = await Booking.findOne({ _id: input.bookingId, seeker: req.user.id, status: 'approved', paymentStatus: 'unpaid' });
  if (!booking) throw httpError(404, 'An approved, unpaid booking was not found');
  const amount = Math.round((booking.totalAmount + booking.depositAmount) * 100);
  if (amount <= 0) throw httpError(400, 'Payment amount must be positive');
  let payment;
  if (env.razorpayKeyId && env.razorpayKeySecret) {
    const order = await razorpayRequest('https://api.razorpay.com/v1/orders', 'POST', {
      amount, currency: 'INR', receipt: `booking_${booking.id}`,
      notes: { bookingId: booking.id, purpose: 'booking_and_optional_deposit' }
    });
    payment = await Payment.create({
      booking: booking.id, user: req.user.id, provider: 'razorpay',
      providerOrderId: order.id, amount: amount / 100
    });
    return send(res, 201, 'Payment order created', {
      paymentId: payment.id, provider: 'razorpay', orderId: order.id,
      amount: order.amount, currency: order.currency, keyId: env.razorpayKeyId,
      demo: false
    });
  }
  if (!env.demoPaymentsEnabled || env.nodeEnv === 'production') throw httpError(503, 'Payment provider is not configured');
  payment = await Payment.create({ booking: booking.id, user: req.user.id, provider: 'demo', amount: amount / 100 });
  send(res, 201, 'DEMO payment order created; no real money will be charged', {
    paymentId: payment.id, provider: 'demo', amount: amount / 100, currency: 'INR', demo: true
  });
}));

router.post('/payments/verify', authenticate, asyncHandler(async (req, res) => {
  const input = z.object({
    paymentId: id,
    razorpay_order_id: z.string().optional(),
    razorpay_payment_id: z.string().optional(),
    razorpay_signature: z.string().optional(),
    demoPaymentConfirmed: z.literal(true).optional()
  }).parse(req.body);
  const payment = await Payment.findOne({ _id: input.paymentId, user: req.user.id, status: 'created' });
  if (!payment) throw httpError(404, 'Pending payment not found');
  if (payment.provider === 'demo') {
    if (!env.demoPaymentsEnabled || env.nodeEnv === 'production' || input.demoPaymentConfirmed !== true) {
      throw httpError(403, 'Demo payment confirmation is available only in explicitly enabled non-production environments');
    }
  } else {
    if (input.razorpay_order_id !== payment.providerOrderId || !input.razorpay_payment_id || !input.razorpay_signature) {
      throw httpError(400, 'Payment verification fields do not match the created order');
    }
    const expected = crypto.createHmac('sha256', env.razorpayKeySecret)
      .update(`${input.razorpay_order_id}|${input.razorpay_payment_id}`).digest();
    let provided;
    try { provided = Buffer.from(input.razorpay_signature, 'hex'); } catch { provided = Buffer.alloc(0); }
    if (provided.length !== expected.length || !crypto.timingSafeEqual(expected, provided)) {
      throw httpError(400, 'Payment signature is invalid');
    }
    const verifiedPayment = await razorpayRequest(
      `https://api.razorpay.com/v1/payments/${encodeURIComponent(input.razorpay_payment_id)}`, 'GET'
    );
    if (verifiedPayment.order_id !== payment.providerOrderId || verifiedPayment.status !== 'captured' ||
      verifiedPayment.amount !== Math.round(payment.amount * 100) || verifiedPayment.currency !== 'INR') {
      throw httpError(400, 'Payment capture or amount could not be verified');
    }
    payment.providerPaymentId = verifiedPayment.id;
  }
  payment.status = 'paid';
  await payment.save();
  const booking = await Booking.findOneAndUpdate(
    { _id: payment.booking, seeker: req.user.id, status: 'approved', paymentStatus: 'unpaid' },
    { $set: { status: 'confirmed', paymentStatus: 'paid' } },
    { new: true }
  );
  if (!booking) throw httpError(409, 'Booking state changed before payment confirmation');
  if (booking.depositAmount > 0) {
    await DepositTransaction.updateOne(
      { booking: booking.id, kind: 'collected' },
      { $setOnInsert: { booking: booking.id, payment: payment.id, user: booking.seeker, kind: 'collected', amount: booking.depositAmount, status: 'held' } },
      { upsert: true }
    );
  }
  await notify(booking.provider, 'payment_confirmed', 'Payment was verified and the booking is confirmed', { bookingId: booking.id });
  send(res, 200, 'Payment verified and booking confirmed', { payment, booking });
}));

router.get('/payments/:id', authenticate, asyncHandler(async (req, res) => {
  const payment = await Payment.findOne({
    _id: req.params.id,
    ...(req.user.roles.includes('admin') ? {} : { user: req.user.id })
  });
  if (!payment) throw httpError(404, 'Payment not found');
  send(res, 200, 'Payment status', { payment });
}));

router.post('/payments/:id/refund', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const input = z.object({ reason: z.string().trim().min(5).max(1000) }).parse(req.body);
  const payment = await Payment.findById(req.params.id);
  if (!payment || payment.status !== 'paid') throw httpError(404, 'Captured payment not found');
  if (payment.provider === 'demo') {
    if (env.nodeEnv === 'production') throw httpError(409, 'Demo refund is disabled in production');
    payment.status = 'refunded';
  } else {
    await razorpayRequest(`https://api.razorpay.com/v1/payments/${encodeURIComponent(payment.providerPaymentId)}/refund`, 'POST', {});
    payment.status = 'refunded';
  }
  payment.refundedAt = new Date();
  await payment.save();
  const booking = await Booking.findById(payment.booking);
  if (booking) {
    booking.paymentStatus = 'refunded';
    if (['approved', 'confirmed'].includes(booking.status)) {
      booking.status = 'cancelled';
      booking.cancelledBy = req.user.id;
      await Resource.updateOne({ _id: booking.resource }, { $pull: { reservations: { booking: booking.id } } });
    }
    await booking.save();
  }
  await AuditLog.create({ actor: req.user.id, action: 'payment.refund', targetType: 'Payment', targetId: payment.id, reason: input.reason });
  send(res, 200, 'Refund requested', { payment });
}));

router.post('/bookings/:id/deposit/refund', authenticate, asyncHandler(async (req, res) => {
  const input = z.object({ reason: z.string().trim().min(5).max(1000) }).parse(req.body);
  const booking = await Booking.findOne({ _id: req.params.id, provider: req.user.id, status: 'completed' });
  if (!booking) throw httpError(404, 'Completed provider booking not found');
  if (await Incident.exists({ booking: booking.id, status: { $in: ['open', 'under_review'] } })) {
    throw httpError(409, 'Resolve open incidents before refunding the deposit');
  }
  const collection = await DepositTransaction.findOne({ booking: booking.id, kind: 'collected', status: 'held' });
  if (!collection) throw httpError(404, 'No held deposit exists for this booking');
  const previous = await DepositTransaction.aggregate([
    { $match: { booking: booking._id, kind: { $in: ['refunded', 'deducted'] } } },
    { $group: { _id: '$kind', amount: { $sum: '$amount' } } }
  ]);
  const refunded = previous.find((item) => item._id === 'refunded')?.amount || 0;
  const deducted = previous.find((item) => item._id === 'deducted')?.amount || 0;
  const amount = Number((collection.amount - refunded - deducted).toFixed(2));
  if (amount <= 0) throw httpError(409, 'No refundable deposit balance remains');
  const payment = await Payment.findOne({ booking: booking.id, status: 'paid', providerPaymentId: { $exists: true } }).sort({ createdAt: -1 });
  let externalReference;
  if (payment?.provider === 'razorpay') {
    const result = await razorpayRequest(
      `https://api.razorpay.com/v1/payments/${encodeURIComponent(payment.providerPaymentId)}/refund`,
      'POST',
      { amount: Math.round(amount * 100), notes: { bookingId: booking.id, reason: input.reason } }
    );
    externalReference = result.id;
  } else if (env.nodeEnv === 'production' || !env.demoPaymentsEnabled) {
    throw httpError(503, 'A verified payment is unavailable for issuing the deposit refund');
  }
  const refund = await DepositTransaction.create({
    booking: booking.id, payment: payment?.id, user: booking.seeker, kind: 'refunded',
    amount, status: 'completed', externalReference, actor: req.user.id, reason: input.reason
  });
  send(res, 201, payment?.provider === 'razorpay' ? 'Deposit refund issued' : 'DEMO deposit refund recorded; no money was transferred', { refund, demo: payment?.provider !== 'razorpay' });
}));

router.post('/reviews', authenticate, asyncHandler(async (req, res) => {
  const input = z.object({ bookingId: id, rating: z.number().int().min(1).max(5), text: z.string().trim().min(1).max(1000) }).parse(req.body);
  if (countWords(input.text) > 50) throw httpError(400, 'A review cannot exceed 50 words');
  const booking = await Booking.findOne({ _id: input.bookingId, status: 'completed', $or: [{ seeker: req.user.id }, { provider: req.user.id }] });
  if (!booking) throw httpError(403, 'Only participants in a completed booking can review each other');
  const recipient = booking.seeker.toString() === req.user.id ? booking.provider : booking.seeker;
  const review = await Review.create({
    booking: booking.id, resource: booking.resource,
    reviewer: req.user.id, recipient, rating: input.rating, text: input.text
  });
  const ratings = await Review.aggregate([
    { $match: { recipient: recipient, moderationStatus: 'visible' } },
    { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } }
  ]);
  if (ratings.length) await User.updateOne({ _id: recipient }, { $set: { averageRating: Number(ratings[0].average.toFixed(2)), ratingCount: ratings[0].count } });
  const resourceRatings = await Review.aggregate([
    { $match: { resource: booking.resource, moderationStatus: 'visible' } },
    { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } }
  ]);
  await Resource.updateOne({ _id: booking.resource }, {
    $set: {
      averageRating: resourceRatings[0] ? Number(resourceRatings[0].average.toFixed(2)) : 0,
      ratingCount: resourceRatings[0]?.count || 0
    }
  });
  await notify(recipient, 'review_received', 'You received a transaction review', { reviewId: review.id });
  send(res, 201, 'Review submitted', { review });
}));

router.get('/users/:id/reviews', asyncHandler(async (req, res) => {
  const items = await Review.find({ recipient: req.params.id, moderationStatus: 'visible' })
    .populate('reviewer', 'name').populate('resource', 'title').sort({ createdAt: -1 }).limit(100);
  send(res, 200, 'User reviews', { items });
}));

router.post('/reviews/:id/report', authenticate, asyncHandler(async (req, res) => {
  const input = z.object({ reason: z.string().trim().min(3).max(1000) }).parse(req.body);
  const review = await Review.findById(req.params.id);
  if (!review) throw httpError(404, 'Review not found');
  review.reportedAt = new Date();
  review.reportReason = input.reason;
  await review.save();
  await notifyAdmins('review_report', 'A review was reported', { reviewId: review.id, reason: input.reason });
  send(res, 200, 'Review report submitted', {});
}));

router.post('/incidents', authenticate, asyncHandler(async (req, res) => {
  const input = z.object({
    bookingId: id,
    type: z.enum(['damage', 'missing_accessories', 'late_return', 'non_return', 'misrepresentation', 'payment_dispute', 'deposit_dispute', 'behaviour', 'other']),
    description: z.string().trim().min(10).max(5000), evidence: z.array(z.string().url()).max(20).default([])
  }).parse(req.body);
  const booking = await Booking.findOne({ _id: input.bookingId, $or: [{ seeker: req.user.id }, { provider: req.user.id }] });
  if (!booking) throw httpError(404, 'Booking not found');
  const subject = booking.seeker.toString() === req.user.id ? booking.provider : booking.seeker;
  const incident = await Incident.create({ booking: booking.id, reporter: req.user.id, subject, ...input, evidence: input.evidence, audit: [{ actor: req.user.id, at: new Date(), action: 'opened' }] });
  await notify(booking.provider, 'incident_opened', 'An incident was reported for a booking', { incidentId: incident.id });
  await notify(booking.seeker, 'incident_opened', 'An incident was reported for a booking', { incidentId: incident.id });
  send(res, 201, 'Incident opened for human review', { incident });
}));

router.get('/incidents/mine', authenticate, asyncHandler(async (req, res) => {
  const items = await Incident.find({ $or: [{ reporter: req.user.id }, { subject: req.user.id }] }).sort({ createdAt: -1 });
  send(res, 200, 'Your incidents', { items });
}));

router.get('/incidents/:id', authenticate, asyncHandler(async (req, res) => {
  const incident = await Incident.findById(req.params.id);
  if (!incident || ![incident.reporter.toString(), incident.subject.toString()].includes(req.user.id) && !req.user.roles.includes('admin')) {
    throw httpError(404, 'Incident not found');
  }
  send(res, 200, 'Incident details', { incident });
}));

router.post('/incidents/:id/appeal', authenticate, asyncHandler(async (req, res) => {
  const input = z.object({ reason: z.string().trim().min(10).max(3000) }).parse(req.body);
  const incident = await Incident.findById(req.params.id);
  if (!incident || ![incident.reporter.toString(), incident.subject.toString()].includes(req.user.id)) throw httpError(404, 'Incident not found');
  if (!['resolved', 'dismissed'].includes(incident.status) || incident.appealStatus !== 'none') throw httpError(409, 'This incident cannot be appealed');
  incident.appealStatus = 'open';
  incident.audit.push({ actor: req.user.id, at: new Date(), action: 'appealed', reason: input.reason });
  await incident.save();
  send(res, 201, 'Appeal submitted for review', { incident });
}));

router.get('/admin/incidents', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const items = await Incident.find().sort({ createdAt: -1 }).limit(200);
  send(res, 200, 'Incident review queue', { items });
}));

router.get('/admin/bookings', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const items = await Booking.find().sort({ createdAt: -1 }).limit(200);
  send(res, 200, 'Recent bookings', { items });
}));

router.patch('/admin/incidents/:id/decision', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const input = z.object({
    status: z.enum(['under_review', 'resolved', 'dismissed']),
    reason: z.string().trim().min(5).max(2000),
    depositDecision: z.enum(['none', 'refund', 'deduct']).default('none'),
    depositDeduction: z.number().positive().optional(),
    honorAdjustment: z.number().min(-100).max(100).default(0)
  }).parse(req.body);
  const incident = await Incident.findById(req.params.id);
  if (!incident) throw httpError(404, 'Incident not found');
  if (['resolved', 'dismissed'].includes(incident.status)) {
    throw httpError(409, incident.appealStatus === 'open' ? 'Resolve the open appeal through the appeal decision endpoint' : 'A final incident decision cannot be changed without an appeal');
  }
  const booking = await Booking.findById(incident.booking);
  if (!booking) throw httpError(409, 'Incident booking no longer exists');
  if (input.honorAdjustment !== 0) {
    if (input.status !== 'resolved') throw httpError(409, 'Honor Score changes require a resolved human-reviewed incident');
    const policy = await getPolicy('honorScore');
    const policyKeyByType = {
      late_return: 'lateReturn', damage: 'damage',
      missing_accessories: 'missingAccessories', non_return: 'nonReturn',
      misrepresentation: 'misrepresentation', payment_dispute: 'paymentDispute',
      deposit_dispute: 'depositDispute', behaviour: 'behaviour', other: 'other'
    };
    const permittedAdjustment = policy?.[policyKeyByType[incident.type]];
    if (!Number.isFinite(permittedAdjustment) || permittedAdjustment === 0 || input.honorAdjustment !== permittedAdjustment) {
      throw httpError(409, 'Honor Score adjustment must match an enabled, configured policy for this incident type');
    }
  }
  if (input.depositDecision !== 'none') {
    if (input.status !== 'resolved') throw httpError(409, 'Deposit decisions require a resolved human-reviewed incident');
    const collection = await DepositTransaction.findOne({ booking: booking.id, kind: 'collected', status: 'held' });
    if (!collection) throw httpError(409, 'There is no held deposit to resolve');
    const previousDeposits = await DepositTransaction.aggregate([
      { $match: { booking: booking._id, kind: { $in: ['refunded', 'deducted'] } } },
      { $group: { _id: '$kind', amount: { $sum: '$amount' } } }
    ]);
    const alreadyResolved = previousDeposits.reduce((total, item) => total + item.amount, 0);
    const remaining = Number((collection.amount - alreadyResolved).toFixed(2));
    const resolutionAmount = input.depositDecision === 'refund' ? remaining : input.depositDeduction;
    if (!resolutionAmount || resolutionAmount > remaining) throw httpError(400, 'Deposit resolution amount exceeds the remaining held balance');
    if (input.depositDecision === 'deduct' && input.status !== 'resolved') {
      throw httpError(409, 'A deposit deduction requires a resolved human-reviewed incident');
    }
    if (input.depositDecision === 'refund') {
      const payment = await Payment.findOne({ booking: booking.id, status: 'paid', providerPaymentId: { $exists: true } }).sort({ createdAt: -1 });
      let externalReference;
      if (payment?.provider === 'razorpay') {
        const result = await razorpayRequest(
          `https://api.razorpay.com/v1/payments/${encodeURIComponent(payment.providerPaymentId)}/refund`,
          'POST',
          { amount: Math.round(resolutionAmount * 100), notes: { incidentId: incident.id, reason: input.reason } }
        );
        externalReference = result.id;
      } else if (env.nodeEnv === 'production' || !env.demoPaymentsEnabled) {
        throw httpError(503, 'A verified payment is unavailable for issuing this deposit refund');
      }
      await DepositTransaction.create({
        booking: booking.id, payment: payment?.id, incident: incident.id, user: booking.seeker,
        kind: 'refunded', amount: resolutionAmount, status: 'completed',
        externalReference, actor: req.user.id, reason: input.reason
      });
    }
    if (input.depositDecision === 'deduct') {
      await DepositTransaction.create({
        booking: booking.id, incident: incident.id, user: booking.seeker,
        kind: 'deducted', amount: resolutionAmount, status: 'completed',
        actor: req.user.id, reason: input.reason
      });
    }
  }
  const before = { status: incident.status, depositDecision: incident.depositDecision, honorAdjustment: incident.honorAdjustment };
  incident.status = input.status;
  incident.decisionReason = input.reason;
  incident.reviewer = req.user.id;
  incident.depositDecision = input.depositDecision;
  incident.honorAdjustment = input.honorAdjustment;
  incident.audit.push({ actor: req.user.id, at: new Date(), action: `decision.${input.status}`, reason: input.reason });
  await incident.save();
  if (input.status === 'resolved' && input.honorAdjustment !== 0) {
    const target = await User.findById(incident.subject);
    const previousScore = target.honorScore;
    target.honorScore = Math.max(0, Math.min(100, previousScore + input.honorAdjustment));
    await target.save();
    const actualDelta = target.honorScore - previousScore;
    await HonorScoreHistory.create({
      user: target.id, booking: incident.booking, incident: incident.id, delta: actualDelta,
      reason: input.reason, reviewer: req.user.id
    });
  }
  if (input.status === 'resolved' && input.depositDecision === 'deduct') {
    await AuditLog.create({ actor: req.user.id, action: 'deposit.deduction_approved', targetType: 'Incident', targetId: incident.id, reason: input.reason, after: { amount: input.depositDeduction } });
  }
  await AuditLog.create({ actor: req.user.id, action: `incident.${input.status}`, targetType: 'Incident', targetId: incident.id, reason: input.reason, before, after: { status: incident.status, depositDecision: incident.depositDecision, honorAdjustment: incident.honorAdjustment } });
  await notify(incident.reporter, 'incident_decision', 'An administrator recorded an incident decision', { incidentId: incident.id, reason: input.reason });
  await notify(incident.subject, 'incident_decision', 'An administrator recorded an incident decision', { incidentId: incident.id, reason: input.reason });
  send(res, 200, 'Incident decision recorded', { incident });
}));

router.get('/admin/users', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const users = await User.find().select('name email phone status roles honorScore averageRating ratingCount createdAt').sort({ createdAt: -1 }).limit(200);
  send(res, 200, 'Users', { users });
}));

router.patch('/admin/incidents/:id/appeal', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const input = z.object({
    decision: z.enum(['uphold', 'reverse']),
    reason: z.string().trim().min(5).max(2000)
  }).parse(req.body);
  const incident = await Incident.findById(req.params.id);
  if (!incident || incident.appealStatus !== 'open' || !['resolved', 'dismissed'].includes(incident.status)) {
    throw httpError(404, 'Open appeal not found');
  }
  if (input.decision === 'reverse' && incident.depositDecision !== 'none') {
    throw httpError(409, 'Deposit appeals require a separate payment-provider review; the original deposit decision was not changed');
  }
  if (input.decision === 'reverse' && incident.honorAdjustment !== 0) {
    const history = await HonorScoreHistory.findOne({ incident: incident.id, reversedAt: { $exists: false } }).sort({ createdAt: -1 });
    if (history) {
      const user = await User.findById(history.user);
      if (!user) throw httpError(409, 'Honor Score recipient no longer exists');
      const before = user.honorScore;
      user.honorScore = Math.max(0, Math.min(100, user.honorScore - history.delta));
      await user.save();
      history.reversedAt = new Date();
      await history.save();
      await HonorScoreHistory.create({
        user: user.id, booking: incident.booking, incident: incident.id,
        delta: user.honorScore - before, reason: `Appeal reversed: ${input.reason}`, reviewer: req.user.id
      });
    }
    incident.honorAdjustment = 0;
  }
  incident.appealStatus = 'resolved';
  incident.audit.push({ actor: req.user.id, at: new Date(), action: `appeal.${input.decision}`, reason: input.reason });
  await incident.save();
  await AuditLog.create({
    actor: req.user.id, action: `incident.appeal.${input.decision}`,
    targetType: 'Incident', targetId: incident.id, reason: input.reason,
    before: { appealStatus: 'open' }, after: { appealStatus: incident.appealStatus, honorAdjustment: incident.honorAdjustment }
  });
  await notify(incident.reporter, 'incident_appeal_decision', 'An administrator reviewed your appeal', { incidentId: incident.id, decision: input.decision });
  await notify(incident.subject, 'incident_appeal_decision', 'An administrator reviewed an incident appeal', { incidentId: incident.id, decision: input.decision });
  send(res, 200, 'Appeal decision recorded', { incident });
}));

router.patch('/admin/users/:id/status', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const input = z.object({ status: z.enum(['active', 'suspended', 'inactive']), reason: z.string().trim().min(5).max(1000) }).parse(req.body);
  const user = await User.findById(req.params.id);
  if (!user) throw httpError(404, 'User not found');
  const before = user.status;
  user.status = input.status;
  user.tokenVersion += 1;
  await user.save();
  await AuditLog.create({ actor: req.user.id, action: 'user.status_changed', targetType: 'User', targetId: user.id, reason: input.reason, before: { status: before }, after: { status: user.status } });
  send(res, 200, 'Account status updated', { id: user.id, status: user.status });
}));

router.get('/admin/policies', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const policies = await PlatformPolicy.find().sort({ key: 1, category: 1 });
  send(res, 200, 'Platform policies', { defaults: DEFAULTS, policies });
}));

router.patch('/admin/policies', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const input = z.object({
    key: z.enum(['pricing', 'inspectionBufferHours', 'fairUse', 'negotiation', 'honorScore']),
    category: z.string().trim().min(1).max(100).default('*'),
    value: z.unknown()
  }).parse(req.body);
  if (input.key === 'inspectionBufferHours' && (typeof input.value !== 'number' || input.value < 0 || input.value > 720)) {
    throw httpError(400, 'Inspection buffer must be a number from 0 to 720 hours');
  }
  if (input.key === 'pricing') {
    const pricing = z.object({ defaultMinimumMultiplier: z.number().positive(), defaultMaximumMultiplier: z.number().positive(), categories: z.record(z.string(), z.object({ minimumMultiplier: z.number().positive(), maximumMultiplier: z.number().positive() })).default({}) }).parse(input.value);
    if (pricing.defaultMaximumMultiplier < pricing.defaultMinimumMultiplier) throw httpError(400, 'Maximum price multiplier must not be below minimum');
    for (const [category, rule] of Object.entries(pricing.categories)) {
      if (rule.maximumMultiplier < rule.minimumMultiplier) throw httpError(400, `Invalid pricing range for ${category}`);
    }
  }
  if (input.key === 'fairUse') {
    const policy = z.object({
      maxActiveBookings: z.number().int().positive().nullable().default(null),
      maxUsageDaysPerRollingPeriod: z.number().positive().nullable().default(null),
      rollingPeriodDays: z.number().int().positive().nullable().default(null)
    }).parse(input.value);
    if ((policy.maxUsageDaysPerRollingPeriod === null) !== (policy.rollingPeriodDays === null)) {
      throw httpError(400, 'Usage-day limit and rolling-period length must be configured together');
    }
  }
  if (input.key === 'negotiation') {
    z.object({
      maxMessages: z.number().int().positive().nullable().default(null),
      maxOffers: z.number().int().positive().nullable().default(null),
      expiresInHours: z.number().positive().nullable().default(null)
    }).parse(input.value);
  }
  if (input.key === 'honorScore') {
    z.object({
      positiveCompletion: z.number().min(0).max(100).default(0),
      lateReturn: z.number().max(0).min(-100).default(0),
      damage: z.number().max(0).min(-100).default(0),
      missingAccessories: z.number().max(0).min(-100).default(0),
      nonReturn: z.number().max(0).min(-100).default(0),
      misrepresentation: z.number().max(0).min(-100).default(0),
      paymentDispute: z.number().max(0).min(-100).default(0),
      depositDispute: z.number().max(0).min(-100).default(0),
      behaviour: z.number().max(0).min(-100).default(0),
      other: z.number().max(0).min(-100).default(0)
    }).parse(input.value);
  }
  const old = await PlatformPolicy.findOne({ key: input.key, category: input.category });
  const policy = await PlatformPolicy.findOneAndUpdate(
    { key: input.key, category: input.category },
    { $set: { value: input.value, updatedBy: req.user.id } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );
  await AuditLog.create({
    actor: req.user.id, action: 'policy.updated', targetType: 'PlatformPolicy',
    targetId: policy.id, reason: 'Administrator policy update',
    before: old ? { value: old.value } : null, after: { key: policy.key, category: policy.category, value: policy.value }
  });
  send(res, 200, 'Platform policy saved', { policy });
}));

router.get('/admin/audit-logs', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const items = await AuditLog.find().populate('actor', 'name email').sort({ createdAt: -1 }).limit(200);
  send(res, 200, 'Audit history', { items });
}));

router.get('/admin/reviews', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const items = await Review.find({ reportedAt: { $exists: true } }).sort({ createdAt: -1 }).limit(200);
  send(res, 200, 'Reported reviews', { items });
}));

router.patch('/admin/reviews/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const input = z.object({ moderationStatus: z.enum(['visible', 'hidden']), reason: z.string().trim().min(5).max(1000) }).parse(req.body);
  const review = await Review.findById(req.params.id);
  if (!review) throw httpError(404, 'Review not found');
  const before = review.moderationStatus;
  review.moderationStatus = input.moderationStatus;
  review.reportedAt = undefined;
  review.reportReason = undefined;
  await review.save();
  const ratings = await Review.aggregate([
    { $match: { recipient: review.recipient, moderationStatus: 'visible' } },
    { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } }
  ]);
  await User.updateOne({ _id: review.recipient }, {
    $set: { averageRating: ratings[0] ? Number(ratings[0].average.toFixed(2)) : 0, ratingCount: ratings[0]?.count || 0 }
  });
  const resourceRatings = await Review.aggregate([
    { $match: { resource: review.resource, moderationStatus: 'visible' } },
    { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } }
  ]);
  await Resource.updateOne({ _id: review.resource }, {
    $set: {
      averageRating: resourceRatings[0] ? Number(resourceRatings[0].average.toFixed(2)) : 0,
      ratingCount: resourceRatings[0]?.count || 0
    }
  });
  await AuditLog.create({ actor: req.user.id, action: 'review.moderated', targetType: 'Review', targetId: review.id, reason: input.reason, before: { moderationStatus: before }, after: { moderationStatus: review.moderationStatus } });
  send(res, 200, 'Review moderation saved', { review });
}));

router.get('/notifications/mine', authenticate, asyncHandler(async (req, res) => {
  const items = await Notification.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(100);
  send(res, 200, 'Your notifications', { items });
}));

router.patch('/notifications/:id/read', authenticate, asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user.id }, { $set: { readAt: new Date() } }, { new: true }
  );
  if (!notification) throw httpError(404, 'Notification not found');
  send(res, 200, 'Notification marked as read', { notification });
}));

module.exports = router;
