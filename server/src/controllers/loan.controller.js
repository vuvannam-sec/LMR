import { z } from 'zod';
import * as loanService from '../services/loan.service.js';
import { usernameSchema, barcodeSchema } from '../utils/validation.js';

const checkoutSchema = z.object({
  username: usernameSchema,
  barcode: barcodeSchema
});

const checkinSchema = z.object({
  condition: z.enum(['New', 'Good', 'Fair', 'Poor', 'Damaged']).default('Good')
});

const idSchema = z.string().regex(/^\d+$/, 'Invalid identifier');

export async function checkout(req, res, next) {
  try {
    const data = checkoutSchema.parse(req.body);
    const loan = await loanService.checkout(data.username, data.barcode, req.user.userId);
    res.status(201).json(loan);
  } catch (error) {
    next(error);
  }
}

export async function getAllLoans(req, res, next) {
  try {
    const status = req.query.status || 'Active';
    const loans = await loanService.getAllLoans(status);
    res.json(loans);
  } catch (error) {
    next(error);
  }
}

export async function checkin(req, res, next) {
  try {
    const loanId = idSchema.parse(req.params.id);
    const { condition } = checkinSchema.parse(req.body);
    const result = await loanService.checkin(loanId, req.user.userId, condition);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function renew(req, res, next) {
  try {
    const loanId = idSchema.parse(req.params.id);
    const loan = await loanService.renew(loanId, req.user.userId);
    res.json(loan);
  } catch (error) {
    next(error);
  }
}

export async function getMemberLoans(req, res, next) {
  try {
    const memberId = req.params.id || req.user.userId;
    const loans = await loanService.getMemberLoans(memberId, req.query.status);
    res.json(loans);
  } catch (error) {
    next(error);
  }
}

export async function getMemberHistory(req, res, next) {
  try {
    const memberId = req.params.id || req.user.userId;
    const history = await loanService.getMemberHistory(memberId);
    res.json(history);
  } catch (error) {
    next(error);
  }
}
