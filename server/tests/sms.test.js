const test = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'test';
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/sharegrid-sms-tests';
process.env.JWT_SECRET = 'sharegrid-sms-test-secret-with-at-least-32-characters';

const { createTwilioSmsService } = require('../src/services/sms');

test('Twilio SMS uses authenticated form-encoded requests and a messaging service when configured', async () => {
  let captured;
  const service = createTwilioSmsService({
    accountSid: 'AC123',
    authToken: 'test-secret',
    messagingServiceSid: 'MG123'
  }, async (url, options) => {
    captured = { url, options };
    return { ok: true };
  });

  assert.equal(service.isConfigured(), true);
  await service.sendVerificationCode('+14155550123', '123456');
  assert.equal(captured.url, 'https://api.twilio.com/2010-04-01/Accounts/AC123/Messages.json');
  assert.equal(captured.options.method, 'POST');
  assert.equal(captured.options.headers.Authorization, `Basic ${Buffer.from('AC123:test-secret').toString('base64')}`);
  const body = new URLSearchParams(captured.options.body);
  assert.equal(body.get('To'), '+14155550123');
  assert.equal(body.get('MessagingServiceSid'), 'MG123');
  assert.match(body.get('Body'), /123456/);
});

test('Twilio SMS reports provider and network failures without exposing provider response details', async () => {
  const rejected = createTwilioSmsService({
    accountSid: 'AC123', authToken: 'test-secret', phoneNumber: '+14155550111'
  }, async () => ({ ok: false, status: 401 }));
  await assert.rejects(rejected.sendVerificationCode('+14155550123', '123456'), (error) => {
    assert.equal(error.status, 502);
    assert.equal(error.message, 'SMS provider rejected the verification message');
    return true;
  });

  const unreachable = createTwilioSmsService({
    accountSid: 'AC123', authToken: 'test-secret', phoneNumber: '+14155550111'
  }, async () => { throw new Error('network details'); });
  await assert.rejects(unreachable.sendVerificationCode('+14155550123', '123456'), (error) => {
    assert.equal(error.status, 502);
    assert.equal(error.message, 'SMS provider could not be reached');
    return true;
  });
});

test('Twilio SMS cannot send when credentials and sender configuration are missing', async () => {
  const service = createTwilioSmsService({}, async () => ({ ok: true }));
  assert.equal(service.isConfigured(), false);
  await assert.rejects(service.sendVerificationCode('+14155550123', '123456'), (error) => {
    assert.equal(error.status, 503);
    return true;
  });
});
