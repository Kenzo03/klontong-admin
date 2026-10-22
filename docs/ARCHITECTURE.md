# Architecture Note

Klontong Admin: Nuxt 3 SPA + NestJS API + PostgreSQL. This note explains the main decisions and their trade-offs. Setup is in the [README](../README.md), and detailed requirements are in the [PRD](PRD.md).

```
Browser ──► Nuxt (3002) ──/api, /uploads──► NestJS (3001) ──► PostgreSQL
            SPA + small proxy server        guards → DTO validation → service → Prisma
```

## 1. Why PostgreSQL

The data is relational and rule-heavy: products belong to categories and are created and changed by users, and every write has an audit row. PostgreSQL lets the **database itself** enforce the rules that matter most:
- `UNIQUE(sku)`;
- `CHECK (stock >= 0)` and `price >= 0`;
- the SKU format;
- "archived means inactive";
- foreign keys with `RESTRICT`.

A bug in the API can't break those rules. It also gives exact `DECIMAL` for weight and dimensions, transactions (so a change and its audit row are saved together or not at all), `JSONB` for the audit snapshots, and the indexing needed later (`pg_trgm` for search). MongoDB would make the constraints and multi-row transactions application code instead.

## 2. Backend structure (NestJS)

One module per feature: `auth`, `users`, `products`, `categories`, `uploads`, plus shared `prisma`, `audit` and `common`. Each request passes the same layers:
1. **Global guards.** `AuthGuard` reads the cookie and loads the user from the database on every request (so deactivation applies immediately). `RolesGuard` reads `@Roles('ADMIN')`. Routes opt out with `@Public()`.
2. **DTO validation.** A global `ValidationPipe` with `whitelist` and `forbidNonWhitelisted` (unknown fields return 400) and `transform` (trim, uppercase the SKU, convert query strings to numbers).
3. **Controllers** handle HTTP only: route, status code, and the `{ data }` wrapper.
4. **Services** hold the business rules and transactions, and call `writeAudit(tx, …)` inside the same transaction.
5. **One exception filter** turns every error, including Prisma's unique, foreign-key and not-found errors, into a single error shape.

There's deliberately **no repository layer**: Prisma already is one, and wrapping it would only add pass-through code. A small mapper (`products.mapper.ts`) decides the API shape: decimals as JSON numbers, the category name flattened, and only safe user fields included.

## 3. Frontend structure (Nuxt 3)

- **SPA (`ssr: false`).** It's an internal tool behind a login: there's no SEO to gain, every page needs the session first, and it avoids Vuetify's server-rendering edge cases.
- **Same-origin proxy** (`server/middleware/proxy.ts`). The browser calls only Nuxt, which forwards `/api` and `/uploads`. The cookie is first-party, there's no CORS, and the API address is a runtime variable (`NUXT_API_BASE`).
- **Service layer.** `services/*.ts` are the only files that know endpoint URLs. They all use one `$api` client, which handles "session ended" (any 401 while logged in) in one place.
- **Pinia.** `auth` holds who is logged in (never the token, which JavaScript can't read). `ui` holds the snackbar and the pending-users badge. A global route middleware decides which pages a logged-out user may see; the backend enforces it.
- **Pages and components.** `ProductForm` is shared by create, view and edit; `ProductImage` handles the image fallback; `ProductHistory` renders the audit trail.
- **List state lives in the URL.** Search, filters, sort and page survive refresh, Back and shared links, and search is debounced by 300 ms. Vuetify 3 provides tables, forms and the phone layouts (list, bottom sheets, floating button).

## 4. API contract

- **Base path** `/api`. **JSON in and out**, except the image upload (multipart in, JSON out).
- **One item:** `{ "data": {…} }`. **A list:** `{ "data": […], "meta": { "page", "pageSize", "total", "totalPages" } }`.
- **Errors:** `{ "statusCode", "error", "code", "message", "details"? }`. `code` is a stable machine code (`SKU_TAKEN`, `ADMIN_ONLY_FIELDS`, `ACCOUNT_PENDING`, …), and the frontend translates it to Indonesian in one table. `details` lists field errors.
- **List query:** `page`, `pageSize` (at most 50), `search` (name or SKU), `categoryId`, `status` (`active`, `inactive`, or `archived` for admins), `sort` (from a whitelist) and `order`.
- **Field names follow the brief's sample**, with documented changes:
  - `weight` in kg with decimals, dimensions in cm;
  - `image` is an uploaded path, not an external URL;
  - added `uom`, `archivedAt` and timestamps.
- **Endpoints:**
  - `auth/{register,login,logout,me,password}`
  - `users` (ADMIN)
  - `categories`
  - `products` (+ `/:id/history`, `/:id/restore`; `DELETE` archives)
  - `uploads/images`

**Authentication choice:** a JWT in an `httpOnly`, `SameSite=Lax` cookie. Compared with a token in `localStorage`, an XSS bug can't read it. Compared with server-side sessions, there's no session store to run. Expiry is checked on every request, and the user's status is re-checked from the database.

## 5. Trade-offs made because of the time limit

- Swagger was **cut**; the contract is documented here and in the PRD. Generating OpenAPI is the next step, so the frontend types can't drift from the backend.
- Excel export and import, a global audit page, password reset, rate limiting, optimistic UI and dark mode were **not built** (see section 9).
- **Frontend tests are missing.** Backend e2e tests cover the business rules instead, because that's where a bug costs the most.
- **Phones:** create and edit are a one-column page instead of the mockup's full-screen dialog, and there's no drag-and-drop image area.
- **Categories and units are fixed seed data** with no management screens.

The time went instead to the parts with the most business value: roles, the audit history, admin approval and real image upload.

## 6. From 100 to 100,000 products

What changes, in the order I'd do it:
1. **Search indexes.** `CREATE EXTENSION pg_trgm`, plus GIN trigram indexes on `name` and `sku` so `ILIKE '%…%'` stops scanning the table. Add a composite index for the default list (`archived_at, is_active, category_id, updated_at DESC`).
2. **Pagination.** Replace `OFFSET` with keyset (cursor) pagination on `(updated_at, id)`, and replace the exact `COUNT(*)` with an estimate or a capped count.
3. **Images** move to object storage with a CDN and generated thumbnails, so the list loads 40 px images, not originals.
4. **Caching.** Categories and other reference data get HTTP caching; list responses get short-lived caching if needed.
5. **Export** becomes an async job: Postgres `COPY` to a file in object storage, with a download link when ready, instead of a big JSON response.
6. **Only if needed:** a search engine (Meilisearch/OpenSearch) for typo-tolerant search, and a read replica for reports.

The API contract doesn't change for any of this. Only `meta` gains a cursor.

## 7. Role-based access control

Already built with two roles:
- **Route level:** `@Roles('ADMIN')` plus a global `RolesGuard`, for user management and archive/restore.
- **Field level, in the service:** STAFF may edit a product but not change its price, stock or unit. The check compares the submitted values with the current ones, so the full edit form still works.
- **Account status** (`PENDING`, `ACTIVE`, `INACTIVE`, `REJECTED`) is checked on every request.

The UI hides or locks what a role can't do, but only the API enforces it. To grow beyond two roles: a `permissions` table (or a policy library like CASL), `@Can('product.price.update')` instead of role names, and permissions loaded with the user in the guard.

## 8. Audit logging

Already built:
- **One `audit_logs` row for every write:** register, approve, reject, role/status change, password change, product create/update/archive/restore.
- **Written by one helper in the same transaction as the change**, so a change can't exist without its record.
- **Contents:** actor, action, entity, full `before` and `after` JSON, an optional reason (required for admin price/stock/unit changes), IP and user agent. Password hashes are never stored.
- **Exposure:** the product page shows the latest 50 entries. The endpoint never returns IP or user agent. The frontend turns the snapshots into readable lines such as "Harga: Rp112.000 → Rp115.000".

Next steps:
- a database role that can't `UPDATE`/`DELETE` audit rows;
- an admin-wide audit page with filters;
- monthly partitioning and retention;
- dedicated `stock_movements` and `price_histories` tables for reports, backfilled from the existing snapshots.

## 9. Deliberately not built, and why

| Not built | Why |
|---|---|
| Excel export/import | Large features in their own right. Designed in the PRD (JSON + SheetJS export, async `COPY` at scale; validated import with dry run) |
| Category and unit management screens | Rarely changes in a small store; seed data is enough for now |
| Stock ledger, multi-unit conversion | Needs its own design (movements, unit factors). The audit log already keeps every change |
| Global audit page | Per-product history covers the main need |
| Forgot password, email verification | Needs email delivery; admin approval covers verification |
| Rate limiting, signing out other sessions on password change | Listed in the README's Production Gaps with the fix |
| Swagger, optimistic UI, dark mode, Dockerized apps | Lower value than the core flow within the time limit |
| Frontend automated tests | Backend e2e tests protect the business rules; frontend tests come next |

**If I had more time, in order:**
1. Playwright tests for the main flows.
2. OpenAPI generation, with typed clients for the frontend.
3. Rate limiting and `tokenVersion`.
4. Trigram indexes and keyset pagination.
5. Object storage for images.
6. Excel export.
