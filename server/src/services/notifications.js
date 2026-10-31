const { Notification } = require('../models');

async function notify(user, type, message, data = {}) {
  return Notification.create({ user, type, message, data });
}

module.exports = { notify };
