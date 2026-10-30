const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const request = require('supertest');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'sharegrid-test-secret-with-at-least-32-characters';
process.env.DEMO_PAYMENTS_ENABLED = 'true';
process.env.ADMIN_EMAILS = 'admin@example.com';

let mongo;
let app;

test.before(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongo.getUri();
  app = require('../src/app');
  await mongoose.connect(process.env.MONGO_URI);
  await Promise.all(Object.values(require('../src/models')).map((model) => model.init()));
});

test.beforeEach(async () => {
  await Promise.all(Object.values(require('../src/models')).map((model) => model.deleteMany({})));
});

test.afterEach(async () => {
  const { VerificationEvidence, OrganisationEvidence } = require('../src/models');
  const [verificationEvidence, organisationEvidence] = await Promise.all([
    VerificationEvidence.find().select('+storedName'),
    OrganisationEvidence.find().select('+storedName')
  ]);
  await Promise.all([...verificationEvidence, ...organisationEvidence].map(async (item) => {
    try {
      await fs.unlink(path.resolve(__dirname, '../private-uploads', item.storedName));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }));
});

test.after(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

async function register(email = 'user@example.com') {
  const response = await request(app).post('/api/auth/register').send({
    name: 'Test User',
    email,
    password: 'a-secure-test-password'
  });
  assert.equal(response.status, 201, JSON.stringify(response.body));
  return response.body.data;
}

async function createApprovedListing(ownerToken, adminToken, title = listing.title) {
  const created = await request(app).post('/api/resources')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ ...listing, title });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const resourceId = created.body.data.resource._id;

  const submitted = await request(app).post('/api/verifications')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({
      resourceId,
      route: 'invoice',
      answers: { brandModel: 'Canon EOS 90D', serialNumber: 'TEST-123', acquiredFrom: 'Retailer', legalAuthority: 'Confirmed' }
    });
  assert.equal(submitted.status, 201, JSON.stringify(submitted.body));
  const verificationId = submitted.body.data.verification._id;

  const evidence = await request(app).post(`/api/verifications/${verificationId}/evidence`)
    .set('Authorization', `Bearer ${ownerToken}`)
    .field('kind', 'invoice')
    .attach('file', Buffer.from([0xff, 0xd8, 0xff, 0xd9]), { filename: 'invoice.jpg', contentType: 'image/jpeg' });
  assert.equal(evidence.status, 201, JSON.stringify(evidence.body));

  const approval = await request(app).patch(`/api/admin/verifications/${verificationId}/decision`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ decision: 'approve', reason: 'Reviewed test invoice evidence' });
  assert.equal(approval.status, 200, JSON.stringify(approval.body));
  return resourceId;
}

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

test('health endpoint returns the standard success envelope', async () => {
  const response = await request(app).get('/api/health');
  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.status, 'ok');
});

test('register, verify email, and reject reuse of the verification token', async () => {
  const account = await register();
  assert.ok(account.emailVerificationToken);
  assert.ok(account.token);

  const verification = await request(app).post('/api/auth/verify-email').send({ token: account.emailVerificationToken });
  assert.equal(verification.status, 200);
  assert.ok(verification.body.data.user.email);

  const replay = await request(app).post('/api/auth/verify-email').send({ token: account.emailVerificationToken });
  assert.equal(replay.status, 400);
});

test('login, protected profile, and logout invalidate the issued token', async () => {
  const account = await register();
  const login = await request(app).post('/api/auth/login').send({
    email: 'user@example.com',
    password: 'a-secure-test-password'
  });
  assert.equal(login.status, 200);
  const token = login.body.data.token;

  const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
  assert.equal(me.status, 200);
  assert.equal(me.body.data.user.email, 'user@example.com');

  const logout = await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${token}`);
  assert.equal(logout.status, 200);
  const afterLogout = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
  assert.equal(afterLogout.status, 401);
  assert.ok(account.token);
});

test('password reset consumes one-time token and invalidates prior sessions', async () => {
  const account = await register();
  const reset = await request(app).post('/api/auth/forgot-password').send({ email: 'user@example.com' });
  assert.equal(reset.status, 200);
  const resetToken = reset.body.data.resetToken;
  assert.ok(resetToken);

  const completion = await request(app).post('/api/auth/reset-password').send({
    token: resetToken,
    password: 'a-different-test-password'
  });
  assert.equal(completion.status, 200);
  const replay = await request(app).post('/api/auth/reset-password').send({
    token: resetToken,
    password: 'another-test-password'
  });
  assert.equal(replay.status, 400);

  const oldPassword = await request(app).post('/api/auth/login').send({
    email: 'user@example.com',
    password: 'a-secure-test-password'
  });
  assert.equal(oldPassword.status, 401);
  const newPassword = await request(app).post('/api/auth/login').send({
    email: 'user@example.com',
    password: 'a-different-test-password'
  });
  assert.equal(newPassword.status, 200);
  assert.ok(account.token);
});

test('resource creation requires four images and stores valid listings as drafts', async () => {
  const account = await register();
  const fewerImages = await request(app).post('/api/resources')
    .set('Authorization', `Bearer ${account.token}`)
    .send({ ...listing, images: listing.images.slice(0, 3) });
  assert.equal(fewerImages.status, 400);

  const created = await request(app).post('/api/resources')
    .set('Authorization', `Bearer ${account.token}`)
    .send(listing);
  assert.equal(created.status, 201, JSON.stringify(created.body));
  assert.equal(created.body.data.resource.status, 'draft');
  assert.equal(created.body.data.resource.verificationStatus, 'unverified');
});

test('users cannot update another owner resource or discover unverified listings', async () => {
  const owner = await register('owner@example.com');
  const other = await register('other@example.com');
  const created = await request(app).post('/api/resources')
    .set('Authorization', `Bearer ${owner.token}`)
    .send(listing);
  const resourceId = created.body.data.resource._id;

  const update = await request(app).patch(`/api/resources/${resourceId}`)
    .set('Authorization', `Bearer ${other.token}`)
    .send({ title: 'Not yours' });
  assert.equal(update.status, 404);
  const booking = await request(app).post('/api/bookings')
    .set('Authorization', `Bearer ${other.token}`)
    .send({
      resourceId,
      start: '2050-10-04T10:00:00.000Z',
      end: '2050-10-05T10:00:00.000Z'
    });
  assert.equal(booking.status, 404);

  const discovery = await request(app).get('/api/resources');
  assert.equal(discovery.status, 200);
  assert.equal(discovery.body.data.items.some((resource) => resource._id === resourceId), false);
});

test('one user can create listings and book another provider resource', async () => {
  const admin = await register('admin@example.com');
  const member = await register('member@example.com');
  assert.deepEqual(member.user.roles, ['user']);

  const providerResource = await createApprovedListing(admin.token, admin.token);
  const ownListing = await request(app).post('/api/resources')
    .set('Authorization', `Bearer ${member.token}`)
    .send({ ...listing, title: 'Member listing' });
  assert.equal(ownListing.status, 201);

  const booking = await request(app).post('/api/bookings')
    .set('Authorization', `Bearer ${member.token}`)
    .send({
      resourceId: providerResource,
      start: '2050-10-04T10:00:00.000Z',
      end: '2050-10-05T10:00:00.000Z'
    });
  assert.equal(booking.status, 201, JSON.stringify(booking.body));
  assert.equal(booking.body.data.booking.seeker, member.user.id);
});

test('provider approval rejects one of two overlapping booking requests', async () => {
  const admin = await register('admin@example.com');
  const provider = await register('provider@example.com');
  const firstSeeker = await register('first@example.com');
  const secondSeeker = await register('second@example.com');
  const resourceId = await createApprovedListing(provider.token, admin.token);
  const dates = {
    resourceId,
    start: '2050-10-04T10:00:00.000Z',
    end: '2050-10-05T10:00:00.000Z'
  };
  const first = await request(app).post('/api/bookings').set('Authorization', `Bearer ${firstSeeker.token}`).send(dates);
  const second = await request(app).post('/api/bookings').set('Authorization', `Bearer ${secondSeeker.token}`).send(dates);
  assert.equal(first.status, 201);
  assert.equal(second.status, 201);

  const decisions = await Promise.all([
    request(app).patch(`/api/bookings/${first.body.data.booking._id}/decision`)
      .set('Authorization', `Bearer ${provider.token}`).send({ decision: 'approve' }),
    request(app).patch(`/api/bookings/${second.body.data.booking._id}/decision`)
      .set('Authorization', `Bearer ${provider.token}`).send({ decision: 'approve' })
  ]);
  assert.deepEqual(decisions.map((response) => response.status).sort(), [200, 409]);
});

test('organisation representatives submit private evidence before asset ownership can be approved', async () => {
  const admin = await register('admin@example.com');
  const owner = await register('organisation-owner@example.com');
  const representative = await register('representative@example.com');
  const outsider = await register('outsider@example.com');

  const created = await request(app).post('/api/organisations')
    .set('Authorization', `Bearer ${owner.token}`)
    .send({ name: 'Test Institute', type: 'institution', registrationNumber: 'TEST-ORG-1' });
  assert.equal(created.status, 201);
  const organisationId = created.body.data.organisation._id;

  const added = await request(app).post(`/api/organisations/${organisationId}/members`)
    .set('Authorization', `Bearer ${owner.token}`)
    .send({ email: 'representative@example.com', role: 'representative' });
  assert.equal(added.status, 200);

  const prematureApproval = await request(app).patch(`/api/admin/organisations/${organisationId}/decision`)
    .set('Authorization', `Bearer ${admin.token}`)
    .send({ decision: 'approve', reason: 'Reviewed organisation evidence' });
  assert.equal(prematureApproval.status, 409);

  const evidence = await request(app).post(`/api/organisations/${organisationId}/evidence`)
    .set('Authorization', `Bearer ${representative.token}`)
    .field('kind', 'authorisation')
    .attach('file', Buffer.from('%PDF-1.4\n%%EOF'), { filename: 'authorisation.pdf', contentType: 'application/pdf' });
  assert.equal(evidence.status, 201);
  const evidenceId = evidence.body.data.evidence.id;

  const privateEvidence = await request(app).get(`/api/organisations/evidence/${evidenceId}`)
    .set('Authorization', `Bearer ${outsider.token}`);
  assert.equal(privateEvidence.status, 404);

  const approval = await request(app).patch(`/api/admin/organisations/${organisationId}/decision`)
    .set('Authorization', `Bearer ${admin.token}`)
    .send({ decision: 'approve', reason: 'Reviewed representative authorisation' });
  assert.equal(approval.status, 200);

  const organisationListing = await request(app).post('/api/resources')
    .set('Authorization', `Bearer ${representative.token}`)
    .send({ ...listing, title: 'Institutional Projector', ownershipType: 'organisation', organisation: organisationId });
  assert.equal(organisationListing.status, 201, JSON.stringify(organisationListing.body));
});

test('accepted offer completes the demo-paid handover and permits mutual reviews', async () => {
  const admin = await register('admin@example.com');
  const seeker = await register('seeker@example.com');
  const resourceId = await createApprovedListing(admin.token, admin.token);

  const conversationResponse = await request(app).post('/api/conversations')
    .set('Authorization', `Bearer ${seeker.token}`).send({ resourceId });
  assert.equal(conversationResponse.status, 201);
  const conversationId = conversationResponse.body.data.conversation._id;

  const offerResponse = await request(app).post(`/api/conversations/${conversationId}/offers`)
    .set('Authorization', `Bearer ${seeker.token}`).send({ amount: 1500 });
  assert.equal(offerResponse.status, 201);
  const offerId = offerResponse.body.data.offer._id;
  const accepted = await request(app).patch(`/api/offers/${offerId}/accept`)
    .set('Authorization', `Bearer ${admin.token}`).send({});
  assert.equal(accepted.status, 200);

  const start = new Date(Date.now() + 2000);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  const bookingResponse = await request(app).post('/api/bookings')
    .set('Authorization', `Bearer ${seeker.token}`)
    .send({
      resourceId, offerId,
      start: start.toISOString(),
      end: end.toISOString()
    });
  assert.equal(bookingResponse.status, 201);
  const booking = bookingResponse.body.data.booking;
  assert.equal(booking.pricePerUnit, 1500);
  assert.equal(booking.totalAmount, 1500);

  const approved = await request(app).patch(`/api/bookings/${booking._id}/decision`)
    .set('Authorization', `Bearer ${admin.token}`).send({ decision: 'approve' });
  assert.equal(approved.status, 200);
  const order = await request(app).post('/api/payments/create-order')
    .set('Authorization', `Bearer ${seeker.token}`).send({ bookingId: booking._id });
  assert.equal(order.status, 201);
  assert.equal(order.body.data.demo, true);

  const paid = await request(app).post('/api/payments/verify')
    .set('Authorization', `Bearer ${seeker.token}`)
    .send({ paymentId: order.body.data.paymentId, demoPaymentConfirmed: true });
  assert.equal(paid.status, 200);
  assert.equal(paid.body.data.booking.status, 'confirmed');
  if (Date.now() < start.getTime()) await new Promise((resolve) => setTimeout(resolve, start.getTime() - Date.now()));

  const checkIn = { condition: 'Working, good condition', photos: ['https://example.com/handover.jpg'], accessories: ['Battery'] };
  const initialCheckIn = await request(app).post(`/api/bookings/${booking._id}/check-in`)
    .set('Authorization', `Bearer ${admin.token}`).send(checkIn);
  assert.equal(initialCheckIn.status, 201, JSON.stringify(initialCheckIn.body));
  const confirmedCheckIn = await request(app).post(`/api/bookings/${booking._id}/check-in`)
    .set('Authorization', `Bearer ${seeker.token}`).send({ confirm: true });
  assert.equal(confirmedCheckIn.status, 200);

  const checkOut = await request(app).post(`/api/bookings/${booking._id}/check-out`)
    .set('Authorization', `Bearer ${seeker.token}`)
    .send({ condition: 'Returned working', photos: ['https://example.com/return.jpg'], accessories: ['Battery'] });
  assert.equal(checkOut.status, 201);
  const confirmedCheckOut = await request(app).post(`/api/bookings/${booking._id}/check-out`)
    .set('Authorization', `Bearer ${admin.token}`).send({ confirm: true });
  assert.equal(confirmedCheckOut.status, 200);

  const completion = await request(app).post(`/api/bookings/${booking._id}/complete-inspection`)
    .set('Authorization', `Bearer ${admin.token}`).send({ reason: 'Resource inspected and returned in good condition' });
  assert.equal(completion.status, 200);

  const seekerReview = await request(app).post('/api/reviews')
    .set('Authorization', `Bearer ${seeker.token}`)
    .send({ bookingId: booking._id, rating: 5, text: 'Resource was in good condition.' });
  assert.equal(seekerReview.status, 201);
  const longReview = await request(app).post('/api/reviews')
    .set('Authorization', `Bearer ${admin.token}`)
    .send({
      bookingId: booking._id, rating: 5,
      text: Array.from({ length: 51 }, (_, index) => `word${index}`).join(' ')
    });
  assert.equal(longReview.status, 400);
  const providerReview = await request(app).post('/api/reviews')
    .set('Authorization', `Bearer ${admin.token}`)
    .send({ bookingId: booking._id, rating: 5, text: 'Returned on time.' });
  assert.equal(providerReview.status, 201);
  const duplicateReview = await request(app).post('/api/reviews')
    .set('Authorization', `Bearer ${seeker.token}`)
    .send({ bookingId: booking._id, rating: 5, text: 'Duplicate review.' });
  assert.equal(duplicateReview.status, 409);
});
