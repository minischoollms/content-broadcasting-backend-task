import type { Request, Response } from 'express';
import Joi from 'joi';
import * as contentService from '../services/content.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';

export const uploadSchema = Joi.object({
  title: Joi.string().min(1).max(200).required(),
  description: Joi.string().max(2000).allow('', null),
  subject: Joi.string().min(1).max(60).required(),
  start_time: Joi.date().iso().optional(),
  end_time: Joi.date().iso().optional(),
  rotation_minutes: Joi.number().integer().min(1).max(24 * 60).default(5),
}).custom((value, helpers) => {
  const hasStart = Boolean(value.start_time);
  const hasEnd = Boolean(value.end_time);
  if (hasStart !== hasEnd) {
    return helpers.error('any.invalid', {
      message: 'start_time and end_time must be provided together',
    });
  }
  if (hasStart && hasEnd && new Date(value.end_time) <= new Date(value.start_time)) {
    return helpers.error('any.invalid', { message: 'end_time must be after start_time' });
  }
  return value;
}, 'time-window');

export const listMineSchema = Joi.object({
  status: Joi.string().valid('uploaded', 'pending', 'approved', 'rejected').optional(),
  subject: Joi.string().optional(),
  page: Joi.number().integer().min(1).default(1),
  page_size: Joi.number().integer().min(1).max(100).default(20),
});

export const upload = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw ApiError.badRequest('File is required (field: "file")');
  if (!req.user) throw ApiError.unauthorized();

  const content = await contentService.uploadContent({
    teacherId: req.user.sub,
    title: req.body.title,
    description: req.body.description ?? null,
    subject: req.body.subject,
    startTime: req.body.start_time ? new Date(req.body.start_time) : null,
    endTime: req.body.end_time ? new Date(req.body.end_time) : null,
    rotationMinutes: req.body.rotation_minutes ?? 5,
    file: req.file,
  });

  res.status(201).json({ content });
});

export const listMine = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const q = req.query as {
    status?: 'uploaded' | 'pending' | 'approved' | 'rejected';
    subject?: string;
    page?: number;
    page_size?: number;
  };
  const { rows, total } = await contentService.getMyContent(req.user.sub, {
    status: q.status,
    subject: q.subject,
    page: q.page ?? 1,
    pageSize: q.page_size ?? 20,
  });
  res.json({
    data: rows,
    pagination: { page: q.page ?? 1, page_size: q.page_size ?? 20, total },
  });
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const content = await contentService.getContentForOwnerOrPrincipal({
    contentId: req.params.id!,
    requesterId: req.user.sub,
    requesterRole: req.user.role,
  });
  res.json({ content });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  await contentService.deleteOwnContent({
    contentId: req.params.id!,
    teacherId: req.user.sub,
  });
  res.status(204).end();
});
