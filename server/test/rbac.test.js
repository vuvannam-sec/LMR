import { describe, expect, it, vi } from 'vitest';
import { requireRole } from '../src/middleware/rbac.js';

function runMiddleware(role, allowedRoles) {
  const req = { user: role ? { userId: '1', role } : null, params: {} };
  const res = {};
  const next = vi.fn();

  requireRole(allowedRoles)(req, res, next);
  return next;
}

describe('role hierarchy', () => {
  it('allows an administrator through librarian routes', () => {
    const next = runMiddleware('Administrator', ['Librarian']);
    expect(next).toHaveBeenCalledWith();
  });

  it('blocks a member from librarian routes', () => {
    const next = runMiddleware('Member', ['Librarian']);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN'
    });
  });

  it('blocks unauthenticated access', () => {
    const next = runMiddleware(null, ['Member']);
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 403 });
  });
});
