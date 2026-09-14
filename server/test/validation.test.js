import { describe, expect, it } from 'vitest';
import {
  usernameSchema,
  requiredText,
  optionalText,
  isbnSchema,
  barcodeSchema
} from '../src/utils/validation.js';

describe('shared input validation', () => {
  it('accepts normal catalog and account values', () => {
    expect(usernameSchema.parse('member_01')).toBe('member_01');
    expect(requiredText(255).parse('The Pragmatic Programmer')).toBe('The Pragmatic Programmer');
    expect(optionalText(100).parse('Addison-Wesley')).toBe('Addison-Wesley');
    expect(isbnSchema.parse('978-0-13-595705-9')).toBe('978-0-13-595705-9');
    expect(barcodeSchema.parse('BC-0001')).toBe('BC-0001');
  });

  it('rejects markup in fields rendered by the current client', () => {
    expect(requiredText(255).safeParse('<img src=x onerror=alert(1)>').success).toBe(false);
    expect(optionalText(255).safeParse('Shelf <script>alert(1)</script>').success).toBe(false);
  });

  it('rejects characters that are unsafe for identifier contexts', () => {
    expect(usernameSchema.safeParse("admin'><script>").success).toBe(false);
    expect(isbnSchema.safeParse("978-1');alert(1)//").success).toBe(false);
    expect(barcodeSchema.safeParse('BC 0001').success).toBe(false);
  });
});
