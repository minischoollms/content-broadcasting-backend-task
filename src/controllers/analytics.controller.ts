import type { Request, Response } from 'express';
import * as analyticsService from '../services/analytics.service';
import { asyncHandler } from '../utils/asyncHandler';

export const overview = asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(parseInt((req.query.limit as string) || '10', 10) || 10, 100);
  const data = await analyticsService.getOverview(limit);
  res.json(data);
});
