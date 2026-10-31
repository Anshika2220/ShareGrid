const { z } = require('zod');
const { httpError } = require('../utils/http');

const locationSchema = z.object({
  address: z.string().trim().min(3).max(300),
  city: z.string().trim().min(1).max(100),
  state: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  coordinates: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]).optional()
});

const availabilitySchema = z.object({
  availableFrom: z.coerce.date().optional(),
  availableUntil: z.coerce.date().optional(),
  blockedDates: z.array(z.object({ start: z.coerce.date(), end: z.coerce.date() })).optional()
});

const fairUseSchema = z.object({
  maxActiveBookings: z.number().int().positive().optional(),
  maxUsageDaysPerRollingPeriod: z.number().positive().optional(),
  rollingPeriodDays: z.number().int().positive().optional()
});

const depositSchema = z.object({
  required: z.boolean().default(false),
  amount: z.number().min(0).default(0),
  refundConditions: z.string().max(1000).optional(),
  deductionConditions: z.string().max(1000).optional()
});

const resourceInput = z.object({
  title: z.string().trim().min(2).max(150),
  category: z.string().trim().min(1).max(100),
  brand: z.string().trim().min(1).max(100),
  model: z.string().trim().min(1).max(100),
  description: z.string().trim().min(10).max(5000),
  images: z.array(z.string().url()).min(4).max(20),
  condition: z.enum(['new', 'like_new', 'good', 'fair', 'poor']),
  conditionDetails: z.string().max(2000).optional(),
  price: z.number().positive(),
  pricingUnit: z.enum(['hourly', 'daily']),
  deposit: depositSchema.default({ required: false, amount: 0 }),
  location: locationSchema,
  availability: availabilitySchema.refine((availability) => {
    if (availability.availableFrom && availability.availableUntil && availability.availableFrom >= availability.availableUntil) return false;
    return (availability.blockedDates || []).every(({ start, end }) => start < end);
  }, 'Availability windows and blocked date ranges must have a positive duration').optional(),
  fairUse: fairUseSchema.refine((fairUse) => (fairUse.maxUsageDaysPerRollingPeriod === undefined) === (fairUse.rollingPeriodDays === undefined),
    'Usage-day limit and rolling-period length must be configured together').optional(),
  accessories: z.array(z.string().max(100)).max(50).optional(),
  usageInstructions: z.string().max(3000).optional(),
  pickupInstructions: z.string().max(1000).optional(),
  ownershipType: z.enum(['individual', 'organisation']),
  organisation: z.string().regex(/^[a-f\d]{24}$/i).optional()
});

const resourcePatchInput = resourceInput.partial().extend({
  location: locationSchema.partial().optional(),
  availability: availabilitySchema.partial().optional(),
  fairUse: fairUseSchema.partial().optional(),
  deposit: depositSchema.partial().optional()
});

function toResourceData(input, existingDeposit) {
  const data = { ...input };
  if (data.location?.coordinates) data.location.coordinates = [data.location.coordinates[0], data.location.coordinates[1]];
  if (data.deposit && existingDeposit) data.deposit = { ...existingDeposit, ...data.deposit };
  if (data.deposit && !data.deposit.required) data.deposit.amount = 0;
  if (data.deposit?.required && data.deposit.amount <= 0) throw httpError(400, 'A required deposit must have a positive amount');
  if (data.ownershipType === 'individual') data.organisation = undefined;
  return data;
}

module.exports = { resourceInput, resourcePatchInput, toResourceData };
