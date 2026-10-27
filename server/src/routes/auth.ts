import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { z } from 'zod';
import { User } from '../models/User';
import { validateBody } from '../middleware/validate';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Use same length to avoid timingSafeEqual throwing; return false
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

const passwordComplexityRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,128}$/;

const loginSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

const registerAdminSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(80, 'Name cannot exceed 80 characters')
    .regex(/^[^<>&"'/]*$/, 'Name contains invalid characters')
    .trim(),
  email: z.string().email('Invalid email address format').trim().toLowerCase(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password cannot exceed 128 characters')
    .regex(
      passwordComplexityRegex,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    )
    .refine((val) => !/^(admin|password|12345678|clientflow)$/i.test(val), {
      message: 'Password cannot be a common dictionary word',
    }),
  adminKey: z.string().optional(),
  honeypot: z.string().optional(),
});

// GET /api/auth/registration-status
router.get('/registration-status', async (_req: Request, res: Response): Promise<void> => {
  const adminCount = await User.countDocuments({ role: 'admin' });
  const configuredKey = process.env.ADMIN_REGISTRATION_KEY?.trim();

  const isInitialSetup = adminCount === 0;
  const isRegistrationOpen = isInitialSetup || !!configuredKey;
  const requiresAdminKey = !!configuredKey;

  res.json({
    isInitialSetup,
    isRegistrationOpen,
    requiresAdminKey,
  });
});

// POST /api/auth/register-admin
router.post(
  '/register-admin',
  validateBody(registerAdminSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, email, password, adminKey, honeypot } = req.body;

      // 1. Anti-bot honeypot check
      if (honeypot) {
        res.status(400).json({ error: 'Registration rejected.' });
        return;
      }

      // 2. Privilege Escalation & Registration Authorization Gate
      const adminCount = await User.countDocuments({ role: 'admin' });
      const configuredKey = process.env.ADMIN_REGISTRATION_KEY?.trim();

      if (adminCount === 0) {
        // Initial setup mode
        if (configuredKey && (!adminKey || !safeCompare(adminKey, configuredKey))) {
          res.status(403).json({ error: 'Invalid or missing Admin Registration Key for initial setup.' });
          return;
        }
      } else {
        // Existing system mode: MUST have configuredKey and valid adminKey
        if (!configuredKey) {
          res.status(403).json({
            error:
              'Public administrator registration is closed. Please log in as an administrator to add new users via Team & Roles, or configure ADMIN_REGISTRATION_KEY in the server environment.',
          });
          return;
        }

        if (!adminKey || !safeCompare(adminKey, configuredKey)) {
          res.status(403).json({ error: 'Invalid or missing Admin Registration Key.' });
          return;
        }
      }

      // 3. User collision check
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        res.status(409).json({ error: 'An account with this email already exists.' });
        return;
      }

      // 4. Hash password with bcrypt
      const passwordHash = await bcrypt.hash(password, 10);
      const newUser = await User.create({
        name,
        email,
        passwordHash,
        role: 'admin',
        isActive: true,
        lastLoginAt: new Date(),
      });

      // 5. Session Fixation Defense: regenerate session upon registration
      req.session.regenerate((err) => {
        if (err) {
          console.error('Session regeneration error on registration:', err);
          res.status(500).json({ error: 'Session initialization failed' });
          return;
        }

        req.session.userId = (newUser._id as any).toString();
        req.session.role = newUser.role;

        res.status(201).json({
          message: 'Administrator registered successfully',
          user: {
            id: newUser._id,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
            isActive: newUser.isActive,
            lastLoginAt: newUser.lastLoginAt,
          },
        });
      });
    } catch (error) {
      console.error('Admin registration error:', error);
      res.status(500).json({ error: 'Internal server error during registration' });
    }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  validateBody(loginSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;

      const user = await User.findOne({ email });
      if (!user) {
        res.status(401).json({ error: 'Invalid email or password.' });
        return;
      }

      if (!user.isActive) {
        res.status(403).json({ error: 'Account is deactivated. Please contact an administrator.' });
        return;
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        res.status(401).json({ error: 'Invalid email or password.' });
        return;
      }

      user.lastLoginAt = new Date();
      await user.save();

      // Session Fixation Defense: regenerate session upon login
      req.session.regenerate((err) => {
        if (err) {
          console.error('Session regeneration error on login:', err);
          res.status(500).json({ error: 'Session initialization failed' });
          return;
        }

        req.session.userId = (user._id as any).toString();
        req.session.role = user.role;

        res.json({
          message: 'Logged in successfully',
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            isActive: user.isActive,
            lastLoginAt: user.lastLoginAt,
          },
        });
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error during login' });
    }
  }
);

// POST /api/auth/logout
router.post('/logout', (req: Request, res: Response): void => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({ error: 'Could not log out' });
      return;
    }
    res.clearCookie('clientflow.sid');
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully' });
  });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const user = req.user!;
  res.json({
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    },
  });
});

export default router;
