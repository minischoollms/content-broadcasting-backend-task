import type { Request, Response, NextFunction } from 'express';
import { Ratelimit } from '@upstash/ratelimit';
import { getRedis } from '../config/redis';
import { env } from '../config/env';

let limiter: Ratelimit | null = null;

function getLimiter(): Ratelimit | null {
  if (limiter) return limiter;
  const redis = getRedis();
  if (!redis) return null;

  limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(
      env.publicRateLimitMax,
      `${env.publicRateLimitWindowMs} ms`,
    ),
    analytics: false,
    prefix: 'rl:public',
  });
  return limiter;
}

/**
 * Public-API rate limit. Backed by Upstash Redis when enabled; otherwise
 * a no-op (so the API still works locally without Redis).
 */
export async function publicRateLimiter(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const rl = getLimiter();
  if (!rl) return next();

  const key = req.ip ?? req.socket.remoteAddress ?? 'anon';
  try {
    const { success, limit, remaining, reset } = await rl.limit(key);
    res.setHeader('X-RateLimit-Limit', String(limit));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset', String(reset));
    if (!success) {
      res.status(429).json({ error: 'Too many requests, slow down.' });
      return;
    }
    next();
  } catch (err) {
    // If Upstash is unreachable, fail open rather than blocking traffic.
    console.warn('[ratelimit] upstash error, failing open:', (err as Error).message);
    next();
  }
}
