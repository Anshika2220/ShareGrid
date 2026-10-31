const mongoose = require('mongoose');

const { Schema } = mongoose;
const objectId = Schema.Types.ObjectId;
const timestamps = { timestamps: true, versionKey: false };

const userSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, trim: true, maxlength: 30 },
  passwordHash: { type: String, required: true, select: false },
  status: { type: String, enum: ['active', 'suspended', 'inactive'], default: 'active', index: true },
  roles: { type: [String], enum: ['user', 'admin'], default: ['user'] },
  emailVerifiedAt: Date,
  emailVerificationTokenHash: { type: String, select: false },
  emailVerificationExpiresAt: { type: Date, select: false },
  phoneVerifiedAt: Date,
  phoneVerificationTokenHash: { type: String, select: false },
  phoneVerificationExpiresAt: { type: Date, select: false },
  phoneVerificationAttempts: { type: Number, default: 0, select: false },
  phoneVerificationSentAt: { type: Date, select: false },
  profile: {
    bio: { type: String, maxlength: 500 },
    avatarUrl: String,
    location: String,
    accountType: { type: String, enum: ['individual', 'business', 'institution'], default: 'individual' }
  },
  honorScore: { type: Number, default: 0, min: 0, max: 100 },
  averageRating: { type: Number, default: 0, min: 0, max: 5 },
  ratingCount: { type: Number, default: 0, min: 0 },
  tokenVersion: { type: Number, default: 0 },
  resetTokenHash: { type: String, select: false },
  resetTokenExpiresAt: { type: Date, select: false }
}, timestamps);

const organisationSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 200 },
  type: { type: String, required: true, enum: ['business', 'institution', 'nonprofit', 'other'] },
  registrationNumber: String,
  verificationStatus: { type: String, enum: ['pending', 'under_review', 'additional_evidence_required', 'approved', 'rejected'], default: 'pending', index: true },
  decisionReason: String,
  reviewer: { type: objectId, ref: 'User' },
  reviewedAt: Date,
  createdBy: { type: objectId, ref: 'User', required: true }
}, timestamps);

const membershipSchema = new Schema({
  organisation: { type: objectId, ref: 'Organisation', required: true, index: true },
  user: { type: objectId, ref: 'User', required: true, index: true },
  role: { type: String, enum: ['owner', 'representative', 'member'], default: 'member' },
  status: { type: String, enum: ['active', 'pending', 'revoked'], default: 'active' }
}, timestamps);
membershipSchema.index({ organisation: 1, user: 1 }, { unique: true });

const resourceSchema = new Schema({
  owner: { type: objectId, ref: 'User', required: true, index: true },
  organisation: { type: objectId, ref: 'Organisation' },
  title: { type: String, required: true, trim: true, maxlength: 150 },
  category: { type: String, required: true, trim: true, index: true },
  brand: { type: String, required: true, trim: true },
  model: { type: String, required: true, trim: true },
  description: { type: String, required: true, maxlength: 5000 },
  images: { type: [{ type: String }], validate: [(images) => images.length >= 4, 'At least four resource photos are required'] },
  condition: { type: String, required: true, enum: ['new', 'like_new', 'good', 'fair', 'poor'] },
  conditionDetails: { type: String, maxlength: 2000 },
  averageRating: { type: Number, default: 0, min: 0, max: 5 },
  ratingCount: { type: Number, default: 0, min: 0 },
  price: { type: Number, required: true, min: 0.01 },
  pricingUnit: { type: String, required: true, enum: ['hourly', 'daily'] },
  deposit: {
    required: { type: Boolean, default: false },
    amount: { type: Number, min: 0, default: 0 },
    refundConditions: { type: String, maxlength: 1000 },
    deductionConditions: { type: String, maxlength: 1000 }
  },
  location: {
    address: { type: String, required: true, maxlength: 300 },
    city: { type: String, required: true, index: true },
    state: String,
    postalCode: String,
    coordinates: { type: [Number], index: '2dsphere' }
  },
  availability: {
    availableFrom: Date,
    availableUntil: Date,
    blockedDates: [{ start: Date, end: Date }]
  },
  fairUse: {
    maxActiveBookings: { type: Number, min: 1 },
    maxUsageDaysPerRollingPeriod: { type: Number, min: 0.01 },
    rollingPeriodDays: { type: Number, min: 1 }
  },
  accessories: [String],
  usageInstructions: { type: String, maxlength: 3000 },
  pickupInstructions: { type: String, maxlength: 1000 },
  ownershipType: { type: String, required: true, enum: ['individual', 'organisation'] },
  verificationStatus: { type: String, enum: ['unverified', 'pending', 'approved', 'rejected', 'additional_evidence_required'], default: 'unverified', index: true },
  status: { type: String, enum: ['draft', 'active', 'paused', 'removed'], default: 'draft', index: true },
  reservations: [{
    booking: { type: objectId, ref: 'Booking', required: true },
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    blockedUntil: { type: Date, required: true }
  }]
}, timestamps);
resourceSchema.index({ title: 'text', description: 'text', brand: 'text', model: 'text' });
resourceSchema.index({ category: 1, 'location.city': 1, status: 1, verificationStatus: 1 });

const verificationSchema = new Schema({
  resource: { type: objectId, ref: 'Resource', required: true, unique: true, index: true },
  applicant: { type: objectId, ref: 'User', required: true, index: true },
  route: { type: String, required: true, enum: ['invoice', 'no_invoice'] },
  answers: { type: Map, of: String, default: {} },
  evidence: [{ type: objectId, ref: 'VerificationEvidence' }],
  status: { type: String, enum: ['pending', 'under_review', 'additional_evidence_required', 'approved', 'rejected'], default: 'pending', index: true },
  decisionReason: String,
  reviewer: { type: objectId, ref: 'User' },
  reviewedAt: Date,
  challengeHash: { type: String, select: false },
  challengeExpiresAt: { type: Date, select: false },
  challengeUsedAt: Date
}, timestamps);

const evidenceSchema = new Schema({
  verification: { type: objectId, ref: 'Verification', required: true, index: true },
  uploader: { type: objectId, ref: 'User', required: true },
  originalName: { type: String, required: true },
  storedName: { type: String, required: true, select: false },
  storageProvider: { type: String, enum: ['local', 's3'], default: 'local' },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  kind: { type: String, enum: ['invoice', 'live_possession', 'serial_label', 'ownership', 'other'], default: 'other' }
}, timestamps);

const organisationEvidenceSchema = new Schema({
  organisation: { type: objectId, ref: 'Organisation', required: true, index: true },
  uploader: { type: objectId, ref: 'User', required: true },
  originalName: { type: String, required: true },
  storedName: { type: String, required: true, select: false },
  storageProvider: { type: String, enum: ['local', 's3'], default: 'local' },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  kind: { type: String, enum: ['registration_document', 'authorisation', 'asset_register', 'other'], required: true }
}, timestamps);

const bookingSchema = new Schema({
  resource: { type: objectId, ref: 'Resource', required: true, index: true },
  seeker: { type: objectId, ref: 'User', required: true, index: true },
  provider: { type: objectId, ref: 'User', required: true, index: true },
  start: { type: Date, required: true },
  end: { type: Date, required: true },
  inspectionBufferHours: { type: Number, required: true, default: 0 },
  status: { type: String, enum: ['requested', 'approved', 'confirmed', 'checked_out', 'returned', 'completed', 'rejected', 'cancelled'], default: 'requested', index: true },
  paymentStatus: { type: String, enum: ['unpaid', 'pending', 'paid', 'refunded', 'failed'], default: 'unpaid', index: true },
  pricePerUnit: { type: Number, required: true, min: 0 },
  pricingUnit: { type: String, required: true, enum: ['hourly', 'daily'] },
  totalAmount: { type: Number, required: true, min: 0 },
  depositAmount: { type: Number, default: 0, min: 0 },
  finalOffer: { type: objectId, ref: 'Offer' },
  decisionReason: String,
  cancelledBy: { type: objectId, ref: 'User' }
}, timestamps);
bookingSchema.index({ resource: 1, start: 1, end: 1, status: 1 });

const conversationSchema = new Schema({
  resource: { type: objectId, ref: 'Resource', required: true, index: true },
  participants: [{ type: objectId, ref: 'User', required: true }],
  booking: { type: objectId, ref: 'Booking' },
  finalOffer: { type: objectId, ref: 'Offer' },
  status: { type: String, enum: ['active', 'closed', 'blocked'], default: 'active' }
}, timestamps);
conversationSchema.index({ resource: 1, participants: 1 }, { unique: true });

const messageSchema = new Schema({
  conversation: { type: objectId, ref: 'Conversation', required: true, index: true },
  sender: { type: objectId, ref: 'User', required: true },
  body: { type: String, required: true, maxlength: 2000 },
  reportedAt: Date,
  reportedBy: { type: objectId, ref: 'User' },
  reportReason: { type: String, maxlength: 1000 }
}, timestamps);

const offerSchema = new Schema({
  conversation: { type: objectId, ref: 'Conversation', required: true, index: true },
  booking: { type: objectId, ref: 'Booking' },
  offeredBy: { type: objectId, ref: 'User', required: true },
  amount: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['pending', 'accepted', 'rejected', 'countered', 'expired'], default: 'pending', index: true },
  expiresAt: Date,
  parentOffer: { type: objectId, ref: 'Offer' }
}, timestamps);

const paymentSchema = new Schema({
  booking: { type: objectId, ref: 'Booking', required: true, index: true },
  user: { type: objectId, ref: 'User', required: true },
  provider: { type: String, enum: ['demo'], required: true },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'INR' },
  status: { type: String, enum: ['created', 'paid', 'failed', 'refund_pending', 'refunded'], default: 'created', index: true },
  purpose: { type: String, enum: ['booking', 'deposit'], default: 'booking' },
  refundedAt: Date
}, timestamps);

const depositTransactionSchema = new Schema({
  booking: { type: objectId, ref: 'Booking', required: true, index: true },
  payment: { type: objectId, ref: 'Payment' },
  incident: { type: objectId, ref: 'Incident' },
  user: { type: objectId, ref: 'User', required: true },
  kind: { type: String, enum: ['collected', 'refunded', 'deducted'], required: true },
  amount: { type: Number, required: true, min: 0.01 },
  status: { type: String, enum: ['held', 'completed'], default: 'completed' },
  actor: { type: objectId, ref: 'User' },
  reason: String
}, timestamps);
depositTransactionSchema.index({ booking: 1, kind: 1 }, { unique: true, partialFilterExpression: { kind: 'collected' } });

const handoverSchema = new Schema({
  booking: { type: objectId, ref: 'Booking', required: true, unique: true, index: true },
  checkIn: {
    at: Date, condition: String, photos: [String], accessories: [String], notes: String,
    providerConfirmedAt: Date, seekerConfirmedAt: Date
  },
  checkOut: {
    at: Date, condition: String, photos: [String], accessories: [String], missingItems: [String], notes: String,
    providerConfirmedAt: Date, seekerConfirmedAt: Date
  }
}, timestamps);

const reviewSchema = new Schema({
  booking: { type: objectId, ref: 'Booking', required: true },
  resource: { type: objectId, ref: 'Resource', required: true, index: true },
  reviewer: { type: objectId, ref: 'User', required: true },
  recipient: { type: objectId, ref: 'User', required: true, index: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  text: { type: String, required: true, maxlength: 1000 },
  moderationStatus: { type: String, enum: ['visible', 'hidden'], default: 'visible' },
  reportedAt: Date,
  reportReason: { type: String, maxlength: 1000 }
}, timestamps);
reviewSchema.index({ booking: 1, reviewer: 1 }, { unique: true });

const incidentSchema = new Schema({
  booking: { type: objectId, ref: 'Booking', required: true, index: true },
  reporter: { type: objectId, ref: 'User', required: true },
  subject: { type: objectId, ref: 'User', required: true },
  type: { type: String, enum: ['damage', 'missing_accessories', 'late_return', 'non_return', 'misrepresentation', 'payment_dispute', 'deposit_dispute', 'behaviour', 'other'], required: true },
  description: { type: String, required: true, maxlength: 5000 },
  evidence: [String],
  status: { type: String, enum: ['open', 'under_review', 'resolved', 'dismissed'], default: 'open', index: true },
  decisionReason: String,
  reviewer: { type: objectId, ref: 'User' },
  depositDecision: { type: String, enum: ['none', 'refund', 'deduct'] },
  honorAdjustment: Number,
  appealStatus: { type: String, enum: ['none', 'open', 'resolved'], default: 'none' },
  audit: [{ actor: objectId, at: Date, action: String, reason: String }]
}, timestamps);

const notificationSchema = new Schema({
  user: { type: objectId, ref: 'User', required: true, index: true },
  type: { type: String, required: true },
  message: { type: String, required: true, maxlength: 500 },
  data: { type: Schema.Types.Mixed, default: {} },
  readAt: Date
}, timestamps);

const auditLogSchema = new Schema({
  actor: { type: objectId, ref: 'User', required: true, index: true },
  action: { type: String, required: true, index: true },
  targetType: String,
  targetId: objectId,
  reason: String,
  before: Schema.Types.Mixed,
  after: Schema.Types.Mixed
}, timestamps);

const policySchema = new Schema({
  key: { type: String, required: true },
  category: { type: String, default: '*' },
  value: { type: Schema.Types.Mixed, required: true },
  updatedBy: { type: objectId, ref: 'User', required: true }
}, timestamps);
policySchema.index({ key: 1, category: 1 }, { unique: true });

const honorHistorySchema = new Schema({
  user: { type: objectId, ref: 'User', required: true, index: true },
  booking: { type: objectId, ref: 'Booking' },
  incident: { type: objectId, ref: 'Incident' },
  delta: { type: Number, required: true },
  reason: { type: String, required: true },
  reviewer: { type: objectId, ref: 'User' },
  reversedAt: Date
}, timestamps);

const usageRecordSchema = new Schema({
  user: { type: objectId, ref: 'User', required: true, index: true },
  resource: { type: objectId, ref: 'Resource', required: true, index: true },
  booking: { type: objectId, ref: 'Booking', required: true, unique: true },
  days: { type: Number, required: true, min: 0 }
}, timestamps);

function model(name, schema) {
  return mongoose.models[name] || mongoose.model(name, schema);
}

module.exports = {
  User: model('User', userSchema),
  Organisation: model('Organisation', organisationSchema),
  Membership: model('Membership', membershipSchema),
  Resource: model('Resource', resourceSchema),
  Verification: model('Verification', verificationSchema),
  VerificationEvidence: model('VerificationEvidence', evidenceSchema),
  OrganisationEvidence: model('OrganisationEvidence', organisationEvidenceSchema),
  Booking: model('Booking', bookingSchema),
  Conversation: model('Conversation', conversationSchema),
  Message: model('Message', messageSchema),
  Offer: model('Offer', offerSchema),
  Payment: model('Payment', paymentSchema),
  DepositTransaction: model('DepositTransaction', depositTransactionSchema),
  HandoverRecord: model('HandoverRecord', handoverSchema),
  Review: model('Review', reviewSchema),
  Incident: model('Incident', incidentSchema),
  Notification: model('Notification', notificationSchema),
  AuditLog: model('AuditLog', auditLogSchema),
  PlatformPolicy: model('PlatformPolicy', policySchema),
  HonorScoreHistory: model('HonorScoreHistory', honorHistorySchema),
  UsageRecord: model('UsageRecord', usageRecordSchema)
};
