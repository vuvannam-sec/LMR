import { z } from 'zod';
import * as bookService from '../services/book.service.js';
import {
  isbnSchema,
  barcodeSchema,
  requiredText,
  optionalText
} from '../utils/validation.js';

const currentYear = new Date().getUTCFullYear();
const categoryIdSchema = z.union([
  z.number().int().positive(),
  z.string().regex(/^\d+$/, 'Category ID must be numeric')
]).nullable().optional();

const publicationYearSchema = z
  .number()
  .int()
  .min(1000)
  .max(currentYear + 1)
  .nullable()
  .optional();

const createBookSchema = z.object({
  isbn: isbnSchema,
  title: requiredText(255),
  author: requiredText(255),
  publisher: optionalText(100),
  publicationYear: publicationYearSchema,
  description: optionalText(5000),
  language: optionalText(30),
  coverImage: z.union([z.string().url().max(255), z.literal('')]).optional(),
  categoryId: categoryIdSchema
});

const updateBookSchema = createBookSchema
  .omit({ isbn: true })
  .partial();

const addCopySchema = z.object({
  barcode: barcodeSchema,
  condition: z.enum(['New', 'Good', 'Fair', 'Poor']).optional(),
  locationCode: optionalText(50)
});

export async function search(req, res, next) {
  try {
    const books = await bookService.search(req.query);
    res.json(books);
  } catch (error) {
    next(error);
  }
}

export async function getByISBN(req, res, next) {
  try {
    const isbn = isbnSchema.parse(req.params.isbn);
    const book = await bookService.getByISBN(isbn);
    res.json(book);
  } catch (error) {
    next(error);
  }
}

export async function create(req, res, next) {
  try {
    const data = createBookSchema.parse(req.body);
    const book = await bookService.create(data);
    res.status(201).json(book);
  } catch (error) {
    next(error);
  }
}

export async function update(req, res, next) {
  try {
    const isbn = isbnSchema.parse(req.params.isbn);
    const data = updateBookSchema.parse(req.body);
    const book = await bookService.update(isbn, data);
    res.json(book);
  } catch (error) {
    next(error);
  }
}

export async function addCopy(req, res, next) {
  try {
    const isbn = isbnSchema.parse(req.params.isbn);
    const data = addCopySchema.parse(req.body);
    const copy = await bookService.addCopy(isbn, data);
    res.status(201).json(copy);
  } catch (error) {
    next(error);
  }
}
