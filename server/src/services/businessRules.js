function isOverlapping(start, end, otherStart, otherEnd) {
  return new Date(start).getTime() < new Date(otherEnd).getTime() &&
    new Date(end).getTime() > new Date(otherStart).getTime();
}

function isOfferWithinRange(amount, range) {
  return Number.isFinite(amount) && amount >= range.minimum && amount <= range.maximum;
}

function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function calculateAmount(pricePerUnit, start, end, pricingUnit) {
  const duration = new Date(end).getTime() - new Date(start).getTime();
  if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(pricePerUnit) || pricePerUnit <= 0) {
    throw new Error('A positive price and valid time range are required');
  }
  const units = pricingUnit === 'hourly'
    ? Math.max(1, Math.ceil(duration / 3600000))
    : Math.max(1, Math.ceil(duration / 86400000));
  return Number((pricePerUnit * units).toFixed(2));
}

module.exports = { isOverlapping, isOfferWithinRange, countWords, calculateAmount };
