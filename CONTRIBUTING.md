# Contributing

LMR is intentionally small. Prefer changes that make an existing workflow safer, clearer, or easier to maintain over large framework rewrites.

## Before opening a pull request

1. Create a focused branch from `main`.
2. Keep unrelated formatting changes out of functional patches.
3. From `server/`, run:

   ```bash
   npm test
   npm run check
   npm run db:validate
   ```

4. Update the README when behavior, setup, or configuration changes.
5. Do not commit `.env` files, credentials, local database dumps, or generated dependency directories.

## Database changes

Schema changes belong in `server/prisma/schema.prisma`. For changes intended to be shared or deployed, commit a Prisma migration rather than relying only on `prisma db push`.

## Pull request notes

A useful pull request description states what changed, why it changed, how it was tested, and any migration or security impact. Screenshots are useful for visible client changes but are not required for backend-only work.

For security-sensitive findings, follow [SECURITY.md](SECURITY.md) instead of opening a public issue.
