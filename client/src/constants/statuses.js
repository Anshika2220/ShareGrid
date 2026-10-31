export const VERIFICATION_STATUSES = Object.freeze([
  'pending',
  'verified',
  'rejected',
])

export const BOOKING_STATUSES = Object.freeze([
  'pending',
  'approved',
  'rejected',
  'waitlisted',
  'payment_pending',
  'confirmed',
  'checked_in',
  'checked_out',
  'completed',
  'cancelled',
  'overdue',
  'disputed',
])

export const PAYMENT_STATUSES = Object.freeze([
  'pending',
  'paid',
  'failed',
  'refund_pending',
  'refunded',
])

export const REVIEW_STATUSES = Object.freeze([
  'published',
  'reported',
  'hidden',
])

export const CONVERSATION_STATUSES = Object.freeze([
  'active',
  'expired',
  'closed',
])

export const OFFER_STATUSES = Object.freeze([
  'pending',
  'accepted',
  'rejected',
  'countered',
  'expired',
])

export const INCIDENT_STATUSES = Object.freeze([
  'open',
  'under_review',
  'resolved',
  'dismissed',
])
