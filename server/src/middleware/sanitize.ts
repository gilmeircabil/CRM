import { Request, Response, NextFunction } from 'express';

/**
 * Escapes regex special characters to prevent ReDoS and regex injection.
 */
export function escapeRegex(text: string): string {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

/**
 * Recursively inspects an object to ensure no keys start with '$' or contain '.'.
 */
function hasNoSqlInjection(obj: any): boolean {
  if (!obj || typeof obj !== 'object') return false;

  for (const key of Object.keys(obj)) {
    if (key.startsWith('$') || key.includes('.')) {
      return true;
    }
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      if (hasNoSqlInjection(obj[key])) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Middleware to reject any requests containing NoSQL injection operators in body, query, or params.
 */
export function sanitizeInputs(req: Request, res: Response, next: NextFunction): void {
  if (hasNoSqlInjection(req.body) || hasNoSqlInjection(req.query) || hasNoSqlInjection(req.params)) {
    res.status(400).json({ error: 'Invalid input characters detected (NoSQL injection prevention).' });
    return;
  }
  next();
}
