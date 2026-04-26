import type { Request, Response } from 'express';
import Joi from 'joi';
import * as approvalService from '../services/approval.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';

export const listAllSchema = Joi.object({
  status: Joi.string().valid('uploaded', 'pending', 'approved', 'rejected').optional(),
  subject: Joi.string().optional(),
  uploaded_by: Joi.string().uuid().optional(),
  page: Joi.number().integer().min(1).default(1),
  page_size: Joi.number().integer().min(1).max(100).default(20),
});

export const rejectSchema = Joi.object({
  reason: Joi.string().min(3).max(2000).required(),
});

export const listAll = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as {
    status?: 'uploaded' | 'pending' | 'approved' | 'rejected';
    subject?: string;
    uploaded_by?: string;
    page?: number;
    page_size?: number;
  };
  const { rows, total } = await approvalService.listAllForPrincipal({
    status: q.status,
    subject: q.subject,
    uploadedBy: q.uploaded_by,
    page: q.page ?? 1,
    pageSize: q.page_size ?? 20,
  });
  res.json({
    data: rows,
    pagination: { page: q.page ?? 1, page_size: q.page_size ?? 20, total },
  });
});

export const listPending = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as { page?: number; page_size?: number };
  const { rows, total } = await approvalService.listAllForPrincipal({
    status: 'pending',
    page: q.page ?? 1,
    pageSize: q.page_size ?? 20,
  });
  res.json({
    data: rows,
    pagination: { page: q.page ?? 1, page_size: q.page_size ?? 20, total },
  });
});

export const approve = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const updated = await approvalService.approve(req.params.id!, req.user.sub);
  res.json({ content: updated });
});

export const reject = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const updated = await approvalService.reject(req.params.id!, req.user.sub, req.body.reason);
  res.json({ content: updated });
});
