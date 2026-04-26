import type { Request, Response } from 'express';
import Joi from 'joi';
import * as authService from '../services/auth.service';
import { asyncHandler } from '../utils/asyncHandler';

export const registerSchema = Joi.object({
  name: Joi.string().min(2).max(120).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(72).required(),
  role: Joi.string().valid('principal', 'teacher').required(),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

export const register = asyncHandler(async (req: Request, res: Response) => {
  const out = await authService.register(req.body);
  res.status(201).json(out);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const out = await authService.login(req.body.email, req.body.password);
  res.json(out);
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  res.json({ user: req.user });
});
