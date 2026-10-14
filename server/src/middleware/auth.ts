import { Request, Response, NextFunction } from 'express';
import { User, IUser } from '../models/User';

declare module 'express-session' {
  interface SessionData {
    userId: string;
    role: 'admin' | 'staff';
  }
}

export interface AuthenticatedRequest extends Request {
  user?: IUser;
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.session || !req.session.userId) {
    res.status(401).json({ error: 'Authentication required. Please log in.' });
    return;
  }

  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      req.session.destroy(() => {});
      res.status(401).json({ error: 'User account no longer exists.' });
      return;
    }

    if (!user.isActive) {
      req.session.destroy(() => {});
      res.status(403).json({ error: 'This account has been deactivated. Please contact an administrator.' });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Authentication check failed.' });
  }
}

export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Access forbidden. Administrator privileges required.' });
    return;
  }
  next();
}
