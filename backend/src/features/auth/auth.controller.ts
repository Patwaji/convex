import { Request, Response } from 'express';
import { z } from 'zod';
import * as authService from './auth.service';
import { ApiResponse } from '../../shared/utils/ApiResponse';

// ─── Validation Schemas ─────────────────────────────────────
const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// ─── Controllers ────────────────────────────────────────────

export async function signup(req: Request, res: Response): Promise<void> {
  const { name, email, password } = signupSchema.parse(req.body);
  const result = await authService.signup(name, email, password);
  ApiResponse.created(res, result, 'Account created successfully');
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = loginSchema.parse(req.body);
  const result = await authService.login(email, password);
  ApiResponse.success(res, result, 'Logged in successfully');
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const { refreshToken } = refreshSchema.parse(req.body);
  const tokens = await authService.refreshTokens(refreshToken);
  ApiResponse.success(res, tokens, 'Tokens refreshed');
}

export async function logout(req: Request, res: Response): Promise<void> {
  await authService.logout(req.user!._id.toString());
  ApiResponse.success(res, null, 'Logged out successfully');
}

export async function getMe(req: Request, res: Response): Promise<void> {
  const user = await authService.getProfile(req.user!._id.toString());
  ApiResponse.success(res, user);
}
