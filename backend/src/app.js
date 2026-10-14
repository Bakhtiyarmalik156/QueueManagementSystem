const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');

const authRoutes = require('./routes/auth');
const serviceRoutes = require('./routes/services');
const counterRoutes = require('./routes/counters');
const ticketRoutes = require('./routes/tickets');
const displayRoutes = require('./routes/display');
const adminRoutes = require('./routes/admin');

function createApp() {
  const app = express();
  app.use(cors({ origin: config.clientOrigin, credentials: true }));
  app.use(express.json());

  app.use('/api/auth', authRoutes);
  app.use('/api/services', serviceRoutes);
  app.use('/api/counters', counterRoutes);
  app.use('/api/tickets', ticketRoutes);
  app.use('/api/display', displayRoutes);
  app.use('/api/admin', adminRoutes);

  // Serve frontend build in production
  const buildPath = path.join(__dirname, '..', '..', 'frontend', 'dist');
  app.use(express.static(buildPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(buildPath, 'index.html'), (err) => {
      if (err) next();
    });
  });

  return app;
}

module.exports = { createApp };