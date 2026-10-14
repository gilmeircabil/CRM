import rateLimit from 'express-rate-limit';

const isTest = process.env.NODE_ENV === 'test';

// Strict limiter on authentication (brute-force defense)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTest ? 1000 : 15, // 15 attempts per 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many authentication attempts. Please try again in 15 minutes.',
  },
});

// Stricter limiter on administrator registration (anti-account flooding)
export const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTest ? 1000 : 5, // 5 registration attempts per 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many registration attempts from this IP. Please try again after 15 minutes.',
  },
});

// Import limiter (prevents abuse on batch contact imports)
export const importLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 1000 : 30, // 30 imports per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Import rate limit exceeded. Please wait a few minutes before importing more batches.',
  },
});

// General API limiter
export const generalApiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: isTest ? 5000 : 300, // 300 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests. Please slow down.',
  },
});
