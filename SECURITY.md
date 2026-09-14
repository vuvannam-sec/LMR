# Security Policy

## Scope

Security fixes are accepted against the current `main` branch. LMR is a development/reference project and should not be treated as a hardened production service.

## Reporting a vulnerability

Do not open a public issue for a vulnerability that could expose data, credentials, or an exploitable security flaw.

If GitHub shows **Report a vulnerability** in the repository Security tab, use that private reporting channel. If private vulnerability reporting is unavailable, contact the repository owner through their GitHub profile before publishing technical details.

Please include:

- affected file or endpoint;
- impact and required preconditions;
- minimal reproduction steps;
- a proposed fix, if you have one.

Avoid including real credentials or personal data in reports.

## Development credentials

Credentials documented in the README, Docker Compose defaults, and Prisma seed data are intentionally local demo values. They must not be reused for an exposed deployment. Real `.env` files are ignored by Git.

If an actual credential is ever committed, removing the file is not sufficient: rotate the credential first, then remove it from the repository and its history where appropriate.
