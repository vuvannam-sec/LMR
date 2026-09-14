import { z } from 'zod';
import * as userService from '../services/user.service.js';
import * as configService from '../services/config.service.js';
import * as auditService from '../services/audit.service.js';
import { usernameSchema, requiredText, optionalText } from '../utils/validation.js';

const createUserSchema = z.object({
  username: usernameSchema,
  email: z.string().trim().email().max(100).transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
  firstName: requiredText(50),
  lastName: requiredText(50),
  role: z.enum(['Member', 'Librarian', 'Administrator']),
  status: z.enum(['Active', 'Inactive', 'Locked', 'Pending']).optional(),
  phone: z.string().trim().max(20).regex(/^[0-9+(). -]*$/, 'Invalid phone number').optional(),
  address: optionalText(255),
  membershipType: z.enum(['Student', 'Faculty', 'Public']).optional(),
  employeeId: z.string().trim().max(20).regex(/^[A-Za-z0-9._-]+$/).optional(),
  department: optionalText(50),
  hireDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD').optional(),
  adminLevel: z.number().int().min(1).max(10).optional(),
  permissions: optionalText(255)
});

const updateUserSchema = z.object({
  role: z.enum(['Member', 'Librarian', 'Administrator']).optional(),
  status: z.enum(['Active', 'Inactive', 'Locked', 'Pending']).optional(),
  firstName: requiredText(50).optional(),
  lastName: requiredText(50).optional(),
  phone: z.string().trim().max(20).regex(/^[0-9+(). -]*$/, 'Invalid phone number').optional(),
  address: optionalText(255)
});

const updateConfigSchema = z.object({
  value: z.string().trim().min(1).max(32).regex(/^\d+(?:\.\d+)?$/, 'Configuration value must be numeric')
});

export async function getUsers(req, res, next) {
  try {
    const users = await userService.getUsers(req.query);
    res.json(users);
  } catch (error) {
    next(error);
  }
}

export async function createUser(req, res, next) {
  try {
    const data = createUserSchema.parse(req.body);
    const user = await userService.createUser(data);
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
}

export async function updateUser(req, res, next) {
  try {
    const data = updateUserSchema.parse(req.body);
    const user = await userService.updateUser(req.params.id, data);
    res.json(user);
  } catch (error) {
    next(error);
  }
}

export async function getConfig(req, res, next) {
  try {
    const config = await configService.getAll();
    res.json(config);
  } catch (error) {
    next(error);
  }
}

export async function updateConfig(req, res, next) {
  try {
    const data = updateConfigSchema.parse(req.body);
    const config = await configService.update(req.params.key, data.value);
    res.json(config);
  } catch (error) {
    next(error);
  }
}

export async function getAuditLogs(req, res, next) {
  try {
    const logs = await auditService.getLogs(req.query);
    res.json(logs);
  } catch (error) {
    next(error);
  }
}
