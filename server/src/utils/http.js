function send(res, status, message, data) {
  return res.status(status).json({ success: true, message, data });
}

function httpError(status, message, details) {
  return Object.assign(new Error(message), { status, details });
}

module.exports = { send, httpError };
