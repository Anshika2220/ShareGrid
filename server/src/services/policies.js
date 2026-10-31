const { PlatformPolicy } = require('../models');
const { isOfferWithinRange } = require('./businessRules');

const DEFAULTS = {
  pricing: { defaultMinimumMultiplier: 0.8, defaultMaximumMultiplier: 1.1, categories: {} },
  inspectionBufferHours: 0,
  fairUse: { maxActiveBookings: null, maxUsageDaysPerRollingPeriod: null, rollingPeriodDays: null },
  negotiation: { maxMessages: null, maxOffers: null, expiresInHours: null },
  honorScore: {
    positiveCompletion: 0, lateReturn: 0, damage: 0, missingAccessories: 0,
    nonReturn: 0, misrepresentation: 0, paymentDispute: 0, depositDispute: 0,
    behaviour: 0, other: 0
  }
};

async function getPolicy(key, category) {
  const specific = category ? await PlatformPolicy.findOne({ key, category }) : null;
  const global = specific || await PlatformPolicy.findOne({ key, category: '*' });
  return global ? global.value : DEFAULTS[key];
}

async function getPricingRange(resource) {
  const config = await getPolicy('pricing');
  const categoryConfig = config.categories && config.categories[resource.category];
  const minimumMultiplier = categoryConfig?.minimumMultiplier ?? config.defaultMinimumMultiplier;
  const maximumMultiplier = categoryConfig?.maximumMultiplier ?? config.defaultMaximumMultiplier;
  if (!(minimumMultiplier > 0) || maximumMultiplier < minimumMultiplier) {
    throw Object.assign(new Error('Pricing policy is not configured correctly'), { status: 500 });
  }
  const range = {
    minimum: Number((resource.price * minimumMultiplier).toFixed(2)),
    maximum: Number((resource.price * maximumMultiplier).toFixed(2))
  };
  if (!isOfferWithinRange(resource.price, range)) {
    throw Object.assign(new Error('Pricing policy does not include the owner asking price'), { status: 500 });
  }
  return range;
}

module.exports = { DEFAULTS, getPolicy, getPricingRange };
