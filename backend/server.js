require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const { seedIfEmpty } = require('./seed');
const { requireAuth, requireRole } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors());

// Parse JSON request bodies
app.use(express.json());

// MongoDB connection URI
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/maintainiq';

// Connect to MongoDB
console.log('Connecting to MongoDB...');
mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log(`Connected to MongoDB successfully at: ${MONGO_URI}`);
    
    // Seed database if empty
    try {
      await seedIfEmpty();
    } catch (err) {
      console.error('Error during database seeding:', err.message);
    }
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    console.log('Ensure MongoDB service is running locally, or verify your MONGO_URI.');
  });

// Database connection check middleware for API endpoints
app.use('/api', (req, res, next) => {
  if (req.path === '/health') return next();
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: 'Database is disconnected. Please use local sandbox/demo fallback.' });
  }
  next();
});

// API Routes
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/assets',      require('./routes/assets'));
app.use('/api/issues',      require('./routes/issues'));
app.use('/api/maintenance', require('./routes/maintenance'));
app.use('/api/users',       require('./routes/users'));
app.use('/api/logs',        require('./routes/logs'));
app.use('/api/ai-triage',   require('./routes/aiTriage'));
app.use('/api',             require('./routes/meta'));
app.use('/api/upload',      require('./routes/upload'));
app.use('/public',          require('./routes/public'));

// Basic health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Database reset endpoint (Admin only — destructive)
app.post('/api/health/reset', requireAuth, requireRole('Admin'), async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({ error: 'Database not connected' });
    }
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
    await seedIfEmpty();
    res.json({ success: true, message: 'Database reset successfully!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve frontend assets if built or run under unified server
app.use(express.static(path.join(__dirname, '../')));

// Fallback to serving the admin portal
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../admin/index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 MaintainIQ Backend Server running on port ${PORT}`);
});
