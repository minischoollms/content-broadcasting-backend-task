import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';

type Role = 'principal' | 'teacher';

export function requireRole(...allowed: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!allowed.includes(req.user.role)) {
      return next(ApiError.forbidden(`Requires role: ${allowed.join(' or ')}`));
    }
    return next();
  };
}
