import { z } from 'zod';
import * as authService from '../services/auth.service.js';
import { usernameSchema, requiredText } from '../utils/validation.js';

const registerSchema = z.object({
  username: usernameSchema,
  email: z.string().trim().email().max(100).transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
  firstName: requiredText(50),
  lastName: requiredText(50),
  membershipType: z.enum(['Student', 'Faculty', 'Public'])
});

const loginSchema = z.object({
  usernameOrEmail: z.string().trim().min(1).max(100),
  password: z.string().min(1).max(128)
});

export async function register(req, res, next) {
  try {
    const data = registerSchema.parse(req.body);
    const result = await authService.register(data);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const credentials = loginSchema.parse(req.body);
    const result = await authService.login(credentials);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getMe(req, res, next) {
  try {
    const user = await authService.getMe(req.user.userId);
    res.json(user);
  } catch (error) {
    next(error);
  }
}

export async function logout(req, res, next) {
  try {
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
}
