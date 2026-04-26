import type { Request, Response } from 'express';
import Joi from 'joi';
import * as scheduling from '../services/scheduling.service';
import { asyncHandler } from '../utils/asyncHandler';

export const liveQuerySchema = Joi.object({
  subject: Joi.string().min(1).max(60).optional(),
});

export const getLiveByTeacher = asyncHandler(async (req: Request, res: Response) => {
  const teacherId = req.params.teacherId!;
  const subject = (req.query.subject as string | undefined)?.trim();

  const result = await scheduling.getLiveForTeacher({ teacherId, subject });
  res.json(result);
});
