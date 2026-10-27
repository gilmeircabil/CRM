import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import express from 'express';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import mongoose from 'mongoose';
import helmet from 'helmet';
import cors from 'cors';
import { connectDB } from './config/db';
import { sanitizeInputs } from './middleware/sanitize';
import { authLimiter, registerLimiter, importLimiter, generalApiLimiter } from './middleware/rateLimiter';
import { generateTaskNotifications } from './services/notificationService';

// Import Routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import customerRoutes from './routes/customers';
import dealRoutes from './routes/deals';
import taskRoutes from './routes/tasks';
import activityRoutes from './routes/activities';
import dashboardRoutes from './routes/dashboard';
import notificationRoutes from './routes/notifications';
import reportRoutes from './routes/reports';
import exportRoutes from './routes/export';
import importRoutes from './routes/import';
import searchRoutes from './routes/search';
import { User } from './models/User';
import bcrypt from 'bcrypt';

const app = express();
const PORT = process.env.PORT || 5000;
const isProd = process.env.NODE_ENV === 'production';

// Trust first proxy (Render / Cloudflare / reverse proxy) so secure cookies & rate limiters work
app.set('trust proxy', 1);

async function startServer() {
  const mongoUri = await connectDB();

  // If DB is empty, automatically create seeded admin user
  const adminCount = await User.countDocuments({ role: 'admin' });
  if (adminCount === 0) {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@clientflow.com';
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      throw new Error('FATAL: ADMIN_PASSWORD must be set to auto-seed admin user.');
    }
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await User.create({
      name: 'System Admin',
      email: adminEmail.toLowerCase().trim(),
      passwordHash,
      role: 'admin',
      isActive: true,
    });
    console.log(`Auto-seeded default admin: ${adminEmail}`);
  }

  // In production, ensure strong custom session secret
  if (isProd && (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.includes('default-secret-key'))) {
    throw new Error('FATAL: A strong, custom SESSION_SECRET must be provided in production.');
  }

  // 1. Security Headers with CSP allowing fonts
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'blob:'],
          connectSrc: ["'self'"],
        },
      },
    })
  );

  // 2. CORS configuration supporting Vercel and local origins
  const clientUrls = process.env.CLIENT_URL
    ? process.env.CLIENT_URL.split(',').map((url) => url.trim().replace(/\/$/, ''))
    : [];

  const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    ...clientUrls,
  ];

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, or same-origin reverse proxies)
        if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
          return callback(null, true);
        }
        return callback(null, false);
      },
      credentials: true,
    })
  );

  // 3. Body parsers (limit 5mb for CSV contact uploads)
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true, limit: '5mb' }));

  // 4. NoSQL injection sanitizer
  app.use(sanitizeInputs);

  // 5. Rate Limiting Middleware (H-01)
  app.use('/api', generalApiLimiter);
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register-admin', registerLimiter);
  app.use('/api/import', importLimiter);

  // 6. Session Management with connect-mongo
  const cookieSameSite = (process.env.COOKIE_SAME_SITE as 'lax' | 'none' | 'strict') || 'lax';

  app.use(
    session({
      name: 'clientflow.sid',
      secret: process.env.SESSION_SECRET || (() => { throw new Error('SESSION_SECRET must be set'); })(),
      resave: false,
      saveUninitialized: false,
      store: MongoStore.create({
        client: mongoose.connection.getClient() as any,
        collectionName: 'sessions',
        ttl: 24 * 60 * 60, // 1 day
      }),
      cookie: {
        httpOnly: true,
        sameSite: cookieSameSite,
        secure: isProd,
        maxAge: 24 * 60 * 60 * 1000,
      },
    })
  );

  // 7. Register API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/customers', customerRoutes);
  app.use('/api/deals', dealRoutes);
  app.use('/api/tasks', taskRoutes);
  app.use('/api/activities', activityRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/export', exportRoutes);
  app.use('/api/import', importRoutes);
  app.use('/api/search', searchRoutes);

  // Health check route
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Global 404 handler for API routes
  app.use('/api/*', (_req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
  });

  // Global Error Handler
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Unhandled Server Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  // Start background notification check (runs every 5 minutes)
  setInterval(() => {
    generateTaskNotifications().catch((err) => console.error('Periodic notification check failed:', err));
  }, 5 * 60 * 1000);

  // Run once on server boot
  generateTaskNotifications().catch(console.error);

  const server = app.listen(PORT, () => {
    console.log(`ClientFlow CRM API server listening on http://localhost:${PORT}`);
  });

  const cleanup = () => {
    server.close(() => {
      process.exit(0);
    });
  };

  process.once('SIGINT', cleanup);
  process.once('SIGTERM', cleanup);

  return server;
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
