const test = require('node:test');
const assert = require('node:assert/strict');
const { isOverlapping, isOfferWithinRange, countWords, calculateAmount } = require('../src/services/businessRules');
const { resourceInput, toResourceData } = require('../src/validators/resource');

const listing = {
  title: 'DSLR Camera',
  category: 'camera',
  brand: 'Canon',
  model: 'EOS 90D',
  description: 'Camera available for short-term rental.',
  images: ['https://example.com/1.jpg', 'https://example.com/2.jpg', 'https://example.com/3.jpg', 'https://example.com/4.jpg'],
  condition: 'good',
  price: 1500,
  pricingUnit: 'daily',
  location: { address: '1 Market Road', city: 'Pune' },
  ownershipType: 'individual'
};

test('availability intervals overlap only when their half-open ranges intersect', () => {
  assert.equal(isOverlapping('2026-10-04T00:00:00Z', '2026-10-08T00:00:00Z', '2026-10-07T00:00:00Z', '2026-10-09T00:00:00Z'), true);
  assert.equal(isOverlapping('2026-10-04T00:00:00Z', '2026-10-08T00:00:00Z', '2026-10-08T00:00:00Z', '2026-10-10T00:00:00Z'), false);
});

test('offers at both policy boundaries are accepted and values outside are rejected', () => {
  const range = { minimum: 800, maximum: 1100 };
  assert.equal(isOfferWithinRange(800, range), true);
  assert.equal(isOfferWithinRange(1100, range), true);
  assert.equal(isOfferWithinRange(799.99, range), false);
  assert.equal(isOfferWithinRange(1100.01, range), false);
});

test('review word count handles whitespace and empty strings', () => {
  assert.equal(countWords('  Returned   in good condition '), 4);
  assert.equal(countWords(' \n\t '), 0);
});

test('booking charges round partial units up and keep INR amounts to two decimals', () => {
  assert.equal(calculateAmount(10, '2026-10-01T10:00:00Z', '2026-10-01T10:01:00Z', 'hourly'), 10);
  assert.equal(calculateAmount(99.95, '2026-10-01T00:00:00Z', '2026-10-02T00:01:00Z', 'daily'), 199.9);
});

test('booking amount rejects invalid times and prices', () => {
  assert.throws(() => calculateAmount(100, '2026-10-02T00:00:00Z', '2026-10-01T00:00:00Z', 'daily'));
  assert.throws(() => calculateAmount(0, '2026-10-01T00:00:00Z', '2026-10-02T00:00:00Z', 'daily'));
});

test('resource listing validation requires at least four photos', () => {
  assert.equal(resourceInput.safeParse(listing).success, true);
  assert.equal(resourceInput.safeParse({ ...listing, images: listing.images.slice(0, 3) }).success, false);
});

test('partial deposit updates preserve whether the deposit is required', () => {
  const updated = toResourceData({ deposit: { amount: 250 } }, { required: true, amount: 100 });
  assert.deepEqual(updated.deposit, { required: true, amount: 250 });
});
