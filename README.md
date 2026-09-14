# LMR — Library Management System

LMR is a small full-stack library management project built around a Node.js/Express API, Prisma, MySQL, and a browser-based JavaScript client. It covers the core circulation workflow: catalog search, member accounts, checkout/checkin, renewals, reservations, overdue fines, administration, and audit records.

The repository is intended as a development/reference project. It is not a production deployment template.

## What is implemented

- Public catalog search and book details
- Member registration and JWT-based login
- Role hierarchy: Member, Librarian, Administrator
- Checkout with a conditional copy-status update to reduce double-loan races
- Checkin with overdue-fine calculation and reservation fulfillment
- Copy condition tracking; damaged returns are moved to `Repair`
- Member renewals, reservations, borrowing history, and fines
- User/configuration administration
- Audit records for circulation operations
- MySQL + phpMyAdmin development stack through Docker Compose

The "Online" fine payment option records a simulated payment in the application database. No payment gateway is integrated. Reservation notifications are stored as notification records; no email provider is connected.

## Stack

| Area | Technology |
| --- | --- |
| API | Node.js, Express |
| Database | MySQL 8 |
| ORM | Prisma |
| Authentication | JWT, bcryptjs |
| Validation | Zod |
| Client | Vanilla JavaScript, Bootstrap 5 |
| Local infrastructure | Docker Compose |
| Tests | Vitest |

## Repository layout

```text
.
├── .github/workflows/ci.yml
├── client/
│   ├── index.html
│   ├── app.js
│   └── style.css
├── server/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.js
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   └── utils/
│   ├── test/
│   ├── .env.example
│   └── package.json
├── .env.example
└── docker-compose.yml
```

## Local setup

### Requirements

- Node.js 18 or newer
- npm
- Docker with Docker Compose

### 1. Start MySQL

The Compose defaults are development-only values. Copy the root environment template if you want to override them.

```bash
cp .env.example .env
docker compose up -d
```

MySQL is exposed on `localhost:3307` by default. phpMyAdmin is available on `http://localhost:8081`.

### 2. Configure the API

```bash
cd server
cp .env.example .env
npm install
```

Replace `JWT_SECRET` in `server/.env` before starting the API. A convenient way to generate one is:

```bash
openssl rand -hex 32
```

The server rejects the placeholder secret and secrets shorter than 32 characters.

### 3. Prepare the database

```bash
npm run db:generate
npm run db:push
npm run db:seed
```

`db:push` is used for the current local bootstrap because this repository does not yet contain a committed SQL migration history. Future schema changes should be committed as Prisma migrations rather than relying on `db push` for deployed environments.

### 4. Start the API

```bash
npm start
```

The API listens on `http://localhost:3000` by default. Health check:

```text
GET http://localhost:3000/health
```

### 5. Serve the client

From the repository root:

```bash
cd client
python -m http.server 8080
```

Open `http://localhost:8080`.

## Development accounts

`npm run db:seed` creates local demo accounts. They all use the development password `Password123!`.

| Role | Username |
| --- | --- |
| Administrator | `admin` |
| Librarian | `librarian1` |
| Member | `member1` |

These are seed credentials, not application secrets. Do not expose a seeded database or reuse these credentials outside local development.

## API overview

| Area | Routes |
| --- | --- |
| Authentication | `/api/auth/*` |
| Catalog | `/api/books/*` |
| Loans | `/api/loans/*` |
| Reservations | `/api/reservations/*` |
| Member self-service | `/api/me/*` |
| Fines | `/api/fines/*` |
| Administration | `/api/admin/*` |

Protected routes expect an access token in the `Authorization` header:

```text
Authorization: Bearer <token>
```

## Configuration

The seeded database contains these operational settings:

| Key | Default | Meaning |
| --- | ---: | --- |
| `loan_period_days` | 14 | Loan duration |
| `max_renewals` | 2 | Maximum renewals per loan |
| `fine_rate_per_day` | 5000 | Overdue fine per day, VND |
| `fine_block_threshold` | 50000 | Unpaid-fine threshold that blocks renewal |
| `reservation_hold_days` | 3 | Reservation pickup window |

Runtime configuration belongs in `server/.env`. See `server/.env.example` for the supported variables.

## Checks

From `server/`:

```bash
npm test
npm run check
npm run db:validate
```

The GitHub Actions workflow runs the same backend checks for pull requests.

## Security notes

- Real `.env` files are ignored by Git.
- The API requires a non-placeholder JWT secret of at least 32 characters.
- CORS origins are explicitly configurable through `CORS_ORIGINS`.
- Request bodies are size-limited and common security headers are set by the API.
- Persisted text/identifier inputs used by the current client are validated to reject markup or unsafe identifier characters.
- Demo database credentials and demo user passwords are for local development only.

For vulnerability reports, see [SECURITY.md](SECURITY.md).

## Current limitations

This project deliberately stays small. Items not currently provided include production deployment manifests, refresh-token/session revocation, real payment processing, outbound email delivery, and a committed database migration history. The browser client also stores its bearer token in `localStorage`, which is acceptable for this demo but should be reconsidered for a production-facing application.

## Contributing

Small, reviewable changes are preferred. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT. See [LICENSE](LICENSE).
