# Klontong Admin

Admin system for a small grocery store ("toko klontong"): store staff manage products (list, search, filter, create, edit, archive), and the owner approves new accounts and controls who may change prices and stock. Every change is recorded and shown as a per-product history.

- **Frontend:** Nuxt 3 (SPA) + Pinia + Vuetify 3, in `apps/frontend`
- **Backend:** NestJS 12 + Prisma 7 + PostgreSQL 17, in `apps/backend`
- **Docs:** [Architecture Note](docs/ARCHITECTURE.md) · [Product requirements (PRD)](docs/PRD.md)

The UI is in Indonesian, because its users are non-technical store staff. Code, comments and docs are in English.

---

## 1. Setup

**Requirements:** Node.js 25, pnpm 12 (`npm install -g pnpm@12`), Docker (for PostgreSQL; any PostgreSQL 17 works too).

```bash
git clone https://github.com/Kenzo03/klontong-admin.git
cd klontong-admin
cp .env.example .env          # PowerShell: Copy-Item .env.example .env
pnpm install                  # also runs `prisma generate` for the backend
pnpm db:up                    # starts PostgreSQL in Docker (port 5432)
pnpm db:deploy                # applies all migrations
pnpm db:seed                  # 3 users, 10 categories, 100 products, 10 images
pnpm dev                      # backend on :3001 and frontend on :3002
```

Open **http://localhost:3002** and log in with an account below. The API is at `http://localhost:3001/api` (health check: `GET /api/health`). The browser only ever talks to port 3002: Nuxt forwards `/api/*` and `/uploads/*` to the backend.

Run one app at a time with `pnpm dev:backend` or `pnpm dev:frontend`.

> **Windows:** keep `127.0.0.1` (not `localhost`) in `DATABASE_URL`. On some Windows setups `localhost` resolves to IPv6 `::1` and the connection to the Docker database fails (Prisma error `P1001`).

## 2. Test accounts

All seeded accounts use the password in `SEED_USER_PASSWORD`, which is `KlontongAdmin!@#` in `.env.example`.

| Email | Role | Status | What to try |
|---|---|---|---|
| `admin@klontong.test` | ADMIN | Active | Everything: price/stock/unit changes (with a reason), archive/restore, approve users |
| `staff@klontong.test` | STAFF | Active | Create and edit products; price, stock and unit are locked when editing |
| `pending@klontong.test` | STAFF | Pending | Login is refused until an admin approves the account in **Pengguna** |

You can also register a new account at `/register`. It stays *pending* until an admin approves it and picks its role.

> Keep the quotes around `SEED_USER_PASSWORD` in `.env`: an unquoted `#` starts a comment, and the password would silently become `KlontongAdmin!@`.

## 3. Environment variables

One `.env` file at the repository root is read by the backend, the Prisma CLI, the seeder and the e2e tests.

| Variable | Used by | Example | Notes |
|---|---|---|---|
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | docker-compose | `klontong` | Credentials of the local database container |
| `DATABASE_URL` | backend, Prisma, seeder | `postgresql://klontong:klontong@127.0.0.1:5432/klontong` | Main database |
| `DATABASE_URL_TEST` | e2e tests | `…/klontong_test` | **Wiped and re-migrated on every e2e run.** Never point it at real data |
| `PORT` | backend | `3001` | |
| `JWT_SECRET` | backend | long random string | At least 32 characters; the backend refuses to start otherwise |
| `JWT_TTL_SECONDS` | backend | `28800` | Session length (8 h). The cookie lives exactly as long as the token |
| `COOKIE_SECURE` | backend | `false` | Set to `true` behind HTTPS so the cookie is only sent over TLS |
| `UPLOAD_DIR` | backend, seeder | `./uploads` | Where product images are stored, relative to `apps/backend` |
| `SEED_USER_PASSWORD` | seeder | `"KlontongAdmin!@#"` | Password of the seeded accounts (keep the quotes) |
| `NUXT_API_BASE` | frontend server | `http://127.0.0.1:3001` | Where the Nuxt proxy forwards `/api` and `/uploads`. Read at runtime by the built Nuxt server; `nuxt dev` uses the same value as its default |

## 4. Database: schema and migrations

- **Schema:** `apps/backend/prisma/schema.prisma`. Migrations are plain SQL in `apps/backend/prisma/migrations` and are committed.
- **Apply migrations** (fresh database, CI, production): `pnpm db:deploy`.
- **Change the schema:** edit `schema.prisma`, then run `pnpm db:migrate` (`prisma migrate dev`). It asks for a name, writes the SQL and regenerates the client.
- **Rules Prisma can't express** are written by hand in SQL. Create the migration with `pnpm --filter ./apps/backend exec prisma migrate dev --create-only`, add the SQL, then run `pnpm db:migrate`. The existing ones are in `20261021084710_init`:
  - CHECK constraints: price ≥ 0, **stock ≥ 0**, weight and dimensions > 0, SKU format `^[A-Z0-9-]{3,50}$`, product and category names not blank;
  - archived products are always inactive;
  - the image is null or an uploaded path;
  - emails are lowercase.
- **Start over:** `pnpm db:reset` drops all data, re-applies every migration and seeds again.

## 5. Seeder

```bash
pnpm db:seed
```

Creates the 3 accounts above, 10 categories and **100 products** (10 per category, real Indonesian grocery items), and copies 10 category images into `UPLOAD_DIR/products/`. The data deliberately covers every UI state: about 10 inactive products, 4 archived, 10 without an image (fallback tile), and an out-of-stock one.

- Safe to run again: seeded accounts get their password reset to `SEED_USER_PASSWORD`, and existing products are left alone (matched by SKU).
- Refuses to run when `NODE_ENV=production`.
- Seeded rows have no audit history, so "Riwayat perubahan" starts with the first change made in the app.

## 6. Tests

| Command | What it runs |
|---|---|
| `pnpm --filter ./apps/backend test` | Unit tests (password hashing) |
| `pnpm --filter ./apps/backend test:e2e` | API end-to-end tests against a real PostgreSQL. Covers auth, approval, roles, products, history, archive, list and uploads (PRD acceptance tests 1–17). Needs the database container running; resets `DATABASE_URL_TEST` first (the database is created if missing) |
| `pnpm run verify` | Exactly what CI runs: lint, type check, unit, e2e, and a production build of both apps |

CI (`.github/workflows/ci.yml`) runs `verify`'s steps on every pull request, with a PostgreSQL 17 service. `main` is protected and requires it to pass. The frontend has no automated tests yet (see [Production Gaps](#9-production-gaps)).

## 7. Project structure

```
apps/
  backend/                       NestJS API
    prisma/
      schema.prisma              data model
      migrations/                SQL migrations (incl. hand-written CHECK constraints)
      seed.ts, seed-images/      demo data
    src/
      main.ts, app.setup.ts      bootstrap: /api prefix, validation, error filter, cookies
      auth/                      register, login, logout, me, change password; AuthGuard, RolesGuard
      users/                     ADMIN user management (approve, reject, role, deactivate)
      products/                  products CRUD, archive/restore, history; DTOs; response mapper
      categories/                category list
      uploads/                   image upload (multipart) and static serving
      audit/                     writeAudit(): one audit row per write, same transaction
      common/                    decorators, exception filter, pagination, input transforms
      prisma/                    PrismaService (one client for the whole app)
    test/                        e2e tests (auth, products) and setup
  frontend/                      Nuxt 3 app (SPA)
    server/middleware/proxy.ts   same-origin proxy: /api and /uploads → backend
    services/                    the only place that knows API URLs (auth, users, products)
    stores/                      Pinia: auth (current user), ui (snackbar, pending badge)
    middleware/auth.global.ts    route guard (public pages opt out)
    plugins/                     $api client (session expiry handling), Vuetify theme
    pages/                       login, register, change-password, users, products (list, [id], new)
    components/                  ProductForm, ProductImage (fallback), ProductHistory, ArchiveDialog
    utils/                       formatting, form rules, error-code messages, product helpers
    types/api.ts                 API response types
docs/
  ARCHITECTURE.md                architecture note
  PRD.md                         product requirements and decisions
docker-compose.yml               PostgreSQL for local development
.env.example
```

## 8. Key decisions (summary)

The full reasoning is in the [Architecture Note](docs/ARCHITECTURE.md).

- **Authentication: JWT in an httpOnly cookie, through a same-origin proxy.** JavaScript can never read the token, so an XSS bug can't steal it. The browser talks only to Nuxt, so the cookie is first-party and no CORS setup is needed. The guard loads the user from the database on every request, so deactivating someone or changing their role applies immediately, not when the token expires.
- **Registration needs approval.** This is an internal tool: anyone can register, but the account stays `PENDING` until an admin approves it and chooses the role, or rejects it as spam.
- **Two roles.** `STAFF` manage products but can't change price, stock or unit after creation. `ADMIN` can, but must give a reason; only admins archive/restore and manage users. Enforced in the API by comparing values, not by hiding fields.
- **Audit log for every write**, in the same database transaction as the change, with full before/after snapshots. The product page shows it as "Riwayat perubahan".
- **Soft delete is "archive":** `archivedAt` is set, the product leaves the list, and an admin can restore it.
- **Field changes from the brief's sample product:**
  - `weight` is in kilograms with decimals (the sample's `500` grams becomes `0.5`), and dimensions are in centimetres; both are exact decimals in the database.
  - `image` is a path to an uploaded file (`/uploads/products/<uuid>.webp`), not an external URL.
  - Added `uom` (unit: Pcs, Dus, Botol…), `archivedAt`, `createdAt`, `updatedAt`.
- **List state lives in the URL.** Search, filters, sort and page survive refresh, Back and shared links. Search is debounced by 300 ms.

## 9. Production Gaps

What is "enough for the assignment" here versus what a real deployment would need.

### Security
- **No rate limiting** on login, register or upload. Add per-IP and per-account throttling (`@nestjs/throttler` or the reverse proxy) and lock out repeated failed logins.
- **Changing the password doesn't sign out other sessions.** Tokens stay valid until they expire (8 h). Fix: a `tokenVersion` column in the token, incremented on password change and checked by the guard.
- **No email verification or password reset.** Admin approval replaces verification for now; "forgot password" needs email delivery.
- **CSRF** relies on `SameSite=Lax` plus JSON-only request bodies, which is fine for a same-site admin tool. A cross-site deployment would need a CSRF token.
- **No security headers.** Add `helmet` (CSP, HSTS, frame-ancestors) in front of both apps.
- **Uploads:** type is checked from the file's bytes and capped at 2 MB, but there's no virus scan and no image re-encoding (re-encoding would also strip metadata). Images are public by URL, acceptable for product photos.
- **The audit log is append-only by convention.** No endpoint edits it, but the app's database user still could. Production: a database role without `UPDATE`/`DELETE` on `audit_logs`.
- **Secrets** come from `.env`. Production: a secret manager, a rotated `JWT_SECRET`, and `COOKIE_SECURE=true`.

### Performance
- Search uses `ILIKE '%…%'` on name and SKU without a trigram index. Fine for hundreds of rows; at 100k, add `pg_trgm` GIN indexes (see the Architecture Note).
- **Offset pagination plus `COUNT(*)`** on every page. Large tables want keyset pagination and an estimated count.
- **No caching.** Categories are fetched on every page load and could be cached (HTTP cache headers or in memory).
- **Images are served by the Node process** from local disk. Production: object storage (S3/R2) behind a CDN.
- The frontend is an SPA, so the first load is a little slower than server rendering. That's acceptable for a logged-in tool.

### Logging and observability
- **Only Nest's default console logger.** Unexpected errors are logged with a stack trace, but there's no structured JSON logging, no request IDs and no access log.
- **No metrics or tracing** (latency, error rate, database time) and **no error tracking** (Sentry or similar), and nothing on the frontend side.
- `GET /api/health` only proves the process is up. It should also check the database for a readiness probe.
- The audit log answers "who changed what", but it isn't operational monitoring.

### Deployment
- **Only PostgreSQL is containerised.** The apps have no Dockerfiles yet. Production would build two images: `node dist/main` for the API, and `node .output/server/index.mjs` for Nuxt, whose server is needed for the proxy, so don't use `nuxt generate`.
- **Uploads live on the API server's disk** (`UPLOAD_DIR`). That doesn't survive multiple instances or a lost volume; move to object storage.
- **Migrations** must run once per release (`prisma migrate deploy`) before the new API version starts, not on every instance's startup.
- **Not set up yet:** HTTPS termination, database backups and restore tests, and a staging environment.
- The cookie requires the API to be reachable through the Nuxt origin (the proxy) or the same site. A separate mobile app would need Bearer-token support added to the guard.

### Testing gaps
- **Frontend:** no automated tests at all. Next steps would be component tests for `ProductForm` and list state (Vitest + Vue Test Utils), then a few Playwright flows (login, create, edit as staff, archive).
- **Backend:** the e2e tests cover the main business rules, but unit tests are minimal (password hashing only), and there are no load tests for the list at 100k rows.
- **Not automated:** phone layouts and accessibility were checked by hand, and there are no contract tests keeping the frontend's API types in sync with the backend.

### Data migration
- **Migrations are forward-only.** Rolling back means writing a new migration. Destructive changes (dropping an enum value, narrowing a column) need a data check first; for example, removing a unit fails if any product still uses it.
- **Units are a fixed enum** and stock is an integer. Selling loose goods by weight would need a decimal stock column and a careful conversion of existing rows.
- **Importing real store data** (an existing spreadsheet) isn't built. It needs a mapping to categories and units, SKU de-duplication and a dry-run report; it's planned as Excel import in the PRD.
- **Seeded products have no history.** Real imported data should get one `product.create` audit row per product, so the history is complete from day one.
- `stock_movements` and `price_histories` tables, for reports, aren't built. They can be backfilled from the audit log's before/after snapshots.

## 10. Time spent

The brief suggests at most 8 hours. I first agreed a scope of about 11.5 hours, and the actual time is below. The extra time went to the nice-to-haves I judged most meaningful: roles, the audit history, admin approval, image upload and the phone layouts.

| Part | Time |
|---|---|
| Planning, PRD, mockup review | _h_ |
| Setup (workspace, Docker, Prisma, seeder) | _h_ |
| Backend: auth and users | _h_ |
| Backend: products, uploads, tests | _h_ |
| Frontend: auth, users | _h_ |
| Frontend: products | _h_ |
| Docs (README, Architecture Note) | _h_ |
| **Total** | **_h_** |

`v0.1-core` tags the point where the required features first worked end to end.

## 11. AI assistance

I used an AI assistant (Claude) throughout, as a planning and pair-programming partner. It drafted the PRD, the UI mockup, this README and the Architecture Note, and it wrote step-by-step implementation guides that included code. I typed and adapted that code myself, debugged the failures, ran the tests and reviewed every decision. The seed product images were generated with Stable Diffusion XL.
