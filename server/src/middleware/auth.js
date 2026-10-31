const jwt = require('jsonwebtoken');
const { User } = require('../models');
const env = require('../config/env');

async function authenticate(req, res, next) {
  try {
    const header = req.get('authorization') || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ success: false, message: 'Authentication required', errors: [] });
    }
    const payload = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(payload.sub);
    if (!user || user.status !== 'active' || user.tokenVersion !== payload.tokenVersion) {
      return res.status(401).json({ success: false, message: 'Session is invalid or expired', errors: [] });
    }
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Invalid or expired token', errors: [] });
    }
    next(error);
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || !req.user.roles.includes('admin')) {
    return res.status(403).json({ success: false, message: 'Administrator access required', errors: [] });
  }
  next();
}

module.exports = { authenticate, requireAdmin };
