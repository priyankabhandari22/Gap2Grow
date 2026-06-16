const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const { startMarketDataSyncScheduler } = require('./services/marketSyncScheduler');

dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ MongoDB connected');
  startMarketDataSyncScheduler();
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  console.warn('Continuing without MongoDB connection (development mode). Some features may be unavailable.');
});

// Global error handlers to prevent nodemon from exiting on uncaught errors during development
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err && err.stack ? err.stack : err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/skills', require('./routes/skills'));
app.use('/api/resumes', require('./routes/resumes'));
app.use('/api/skill-gaps', require('./routes/skillGaps'));
app.use('/api/learning-paths', require('./routes/learningPaths'));
app.use('/api/job-market', require('./routes/jobMarket'));
app.use('/api/progress', require('./routes/progress'));
app.use('/api/reports', require('./routes/reports'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

// Render probe / favicon silence
app.get(['/', '/favicon.ico'], (req, res) => {
  res.json({ status: 'ok' });
});

// 404 handler
app.use((req, res) => {
  console.log(`\n--- [BACKEND: 404 HANDLER] Route not found: ${req.method} ${req.url} ---`);
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
