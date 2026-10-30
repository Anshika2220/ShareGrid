const { httpError } = require('../utils/http');

function createTwilioSmsService(config, fetchImpl = globalThis.fetch) {
  function isConfigured() {
    return Boolean(
      config.accountSid && config.authToken &&
      (config.phoneNumber || config.messagingServiceSid)
    );
  }

  async function sendVerificationCode(to, code) {
    if (!isConfigured()) throw httpError(503, 'SMS delivery is not configured; contact the administrator');
    const body = new URLSearchParams({ To: to, Body: `Your ShareGrid verification code is ${code}. It expires in 10 minutes.` });
    if (config.messagingServiceSid) body.set('MessagingServiceSid', config.messagingServiceSid);
    else body.set('From', config.phoneNumber);
    const credentials = Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64');
    let response;
    try {
      response = await fetchImpl(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(config.accountSid)}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body,
        signal: AbortSignal.timeout(10000)
      });
    } catch (error) {
      throw httpError(502, 'SMS provider could not be reached');
    }
    if (!response.ok) {
      throw httpError(502, 'SMS provider rejected the verification message');
    }
  }

  return { isConfigured, sendVerificationCode };
}

const service = createTwilioSmsService({
  accountSid: require('../config/env').twilioAccountSid,
  authToken: require('../config/env').twilioAuthToken,
  phoneNumber: require('../config/env').twilioPhoneNumber,
  messagingServiceSid: require('../config/env').twilioMessagingServiceSid
});

module.exports = { ...service, createTwilioSmsService };
