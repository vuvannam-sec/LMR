import { z } from 'zod';

const noMarkup = (value) => !/[<>]/.test(value);
const markupMessage = 'HTML markup is not allowed';

export const usernameSchema = z
  .string()
  .trim()
  .min(3)
  .max(50)
  .regex(/^[A-Za-z0-9._-]+$/, 'Use letters, numbers, dot, underscore, or hyphen only');

export const requiredText = (maxLength) => z
  .string()
  .trim()
  .min(1)
  .max(maxLength)
  .refine(noMarkup, markupMessage);

export const optionalText = (maxLength) => z
  .string()
  .trim()
  .max(maxLength)
  .refine(noMarkup, markupMessage)
  .optional();

export const isbnSchema = z
  .string()
  .trim()
  .min(10)
  .max(20)
  .regex(/^[0-9Xx-]+$/, 'ISBN may contain digits, X, and hyphens only');

export const barcodeSchema = z
  .string()
  .trim()
  .min(1)
  .max(20)
  .regex(/^[A-Za-z0-9._-]+$/, 'Barcode contains unsupported characters');
