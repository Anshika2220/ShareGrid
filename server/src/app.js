const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const env = require('./config/env');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const resourceRoutes = require('./routes/resources');
const verificationRoutes = require('./routes/verifications');
const adminVerificationRoutes = require('./routes/adminVerifications');
const organisationRoutes = require('./routes/organisations');
const bookingRoutes = require('./routes/bookings');
const marketplaceRoutes = require('./routes/marketplace');
const { notFound, errorHandler } = require('./middleware/errors');
const { send } = require('./utils/http');

const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || origin === env.clientUrl) return callback(null, true);
    if (env.nodeEnv !== 'production') {
      try {
        const { hostname, protocol } = new URL(origin);
        if (protocol === 'http:' && ['localhost', '127.0.0.1'].includes(hostname)) {
          return callback(null, true);
        }
      } catch {
        return callback(null, false);
      }
    }
    return callback(null, false);
  },
  credentials: false
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

app.get('/api/health', (req, res) => send(res, 200, 'ShareGrid API is healthy', { status: 'ok', timestamp: new Date().toISOString() }));
app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.nodeEnv === 'test' ? 1000 : 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false
}), authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/verifications', verificationRoutes);
app.use('/api/admin/verifications', adminVerificationRoutes);
app.use('/api/organisations', organisationRoutes.router);
app.use('/api/admin/organisations', organisationRoutes.adminRouter);
app.use('/api/bookings', bookingRoutes);
app.use('/api', marketplaceRoutes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
