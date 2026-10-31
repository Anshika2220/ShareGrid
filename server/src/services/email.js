const nodemailer = require('nodemailer');
const env = require('../config/env');
const { httpError } = require('../utils/http');

let transporter;

function isConfigured() {
  return Boolean(env.smtpHost && env.smtpUser && env.smtpPassword);
}

function getTransporter() {
  if (!isConfigured()) throw httpError(503, 'Email delivery is not configured; contact the administrator');
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpSecure,
      auth: { user: env.smtpUser, pass: env.smtpPassword }
    });
  }
  return transporter;
}

async function sendAccountEmail({ to, subject, text }) {
  await getTransporter().sendMail({ from: env.mailFrom, to, subject, text });
}

function resetTransporterForTests() {
  transporter = undefined;
}

module.exports = { isConfigured, sendAccountEmail, resetTransporterForTests };
