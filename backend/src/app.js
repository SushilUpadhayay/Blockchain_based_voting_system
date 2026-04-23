const express = require('express');
const cors = require('cors');
const { errorHandler } = require('./middleware/errorHandler');

const rateLimit = require('express-rate-limit');

// import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // Limit each IP to 5 requests per `window` (per 5 minutes)
  message: 'Too many requests from this IP, please try again after 5 minutes',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically (for mock/dev purposes)
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);

// Error Handler
app.use(errorHandler);

module.exports = app;
