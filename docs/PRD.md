# Klontong Admin: Product Requirements Document

| | |
|---|---|
| Status | Approved for build |
| Date | 2026-10-21 |
| Submission deadline | 2026-10-23, 15:40 WIB |
| Clickable mockup | https://claude.ai/artifact/QtEAtY9kbC423A1C6hFdpp |
| Source brief | BRIK Lead Engineer Take-Home Test (Klontong Admin) |

## 1. Why this exists

A small grocery shop (toko klontong) wants to manage its products for online sales. Today its tooling is minimal. The shop needs an admin system that non-technical staff can use every day, from a laptop at the counter or from a phone in the stockroom, and that the owner can trust: prices and stock cannot be changed by just anyone, every change is traceable, and nobody gets in without the owner's approval.

This is also a lead-engineer take-home test. The reviewers judge the running app, but just as much the technical decisions, the structure, the code quality, and how clearly trade-offs are explained. A focused, well-reasoned solution beats a large unstructured one.

### Success looks like

- Every required feature of the brief works end to end, from a fresh clone, by following the README.
- The README, Architecture Note and Production Gaps section let two other engineers continue without the author.
- Scope beyond the brief is deliberate, explained, and disclosed together with the time spent.

### Anti-goals (a failure even if it "works")

- Core features or documentation weakened to make room for extras.
- Any API request or response that is not JSON, other than the one documented upload endpoint.
- Hard-deleting products or users, or losing who changed what.
- Staff able to change price, stock or unit, or to archive, by calling the API directly.
- Exposing IP addresses or user agents to staff.

### Brief coverage

The brief (in Indonesian) is summarised here so this document stands on its own. **Required** items form the core slice: build them first, tag `v0.1-core` when they all work, and never cut them.

| Brief requirement | Status | Where |
|---|---|---|
| Nuxt 3 + Pinia, NestJS, PostgreSQL or MongoDB; frontend and backend as separate apps | Required | Section 4 |
| All requests and responses in JSON | Required | Sections 4, 10 (one documented exception) |
| Tidy, consistent HTTP API; backend validation of input payloads | Required | Sections 10, 11 |
| Frontend consumes the API through a clear structure (service layer or composables) | Required | Section 17 |
| Clear project structure, naming and separation of concerns | Required | Architecture Note |
| Register, login, protected pages; explain the auth approach in the README or Architecture Note | Required | Section 5 |
| Product list, detail, create, edit, soft delete or archive | Required | Section 6 |
| List: server-side pagination, search by name or SKU, filter by category or active status, sort on at least one field, loading, empty and error states | Required | Section 6.1 |
| Clear schema, backend validation, sensible constraints such as unique SKU, seeder of about 100 products | Required | Sections 9, 11, 13 |
| Architecture Note (1–2 pages): why PostgreSQL, NestJS structure, Nuxt structure, API contract design, time trade-offs, growing from 100 to 100,000 products, adding RBAC, adding audit logging, what was deliberately not built | Required | Separate document |
| README section titled "Production Gaps": security, performance, logging and observability, deployment, testing gaps, data migration | Required | README |
| README handoff: setup steps, environment variables, migration and schema setup, running the seeder, running tests, test accounts, folder structure, key architecture decisions | Required | README |
| Deliverables: frontend app, backend app, README, Architecture Note, `.env.example`, schema and migrations, seeder, sample test credentials | Required | Section 16 |
| Responsive mobile-first UI | Nice to have, **in** | Section 8 |
| Search state persistence, debounced search | Nice to have, **in** | Section 6.1 |
| Docker / docker-compose | Nice to have, **partly in** (Postgres only) | Section 3.2 |
| Role support (admin and staff) | Nice to have, **in** | Sections 2, 5.4 |
| Image fallback handling | Nice to have, **in** | Section 6.4 |
| Basic CI workflow | Nice to have, **in**: GitHub Actions runs lint, type check, unit tests, e2e tests (with a Postgres service) and the build on every pull request; `main` requires it to pass | `.github/workflows/ci.yml` |
| Swagger / OpenAPI | Nice to have, **out** (time went to the history screen); the API contract is documented in the README and Architecture Note instead | Section 3.2 |
| Optimistic UI | Nice to have, **out** | Section 3.2 |

The brief allows changing the sample product fields when the reason is explained. It asks for no deployment, and it says nothing about how AI assistance should be handled.

## 2. Users and roles

| Role | Who | Can do |
|---|---|---|
| ADMIN | The owner, or a trusted employee | Everything a STAFF can, plus: change price, stock and unit; archive and restore products; approve users, change roles, deactivate and reactivate users |
| STAFF | Shop employees | View, search and filter products; create products, including their initial price, stock and unit; edit all other product fields (name, SKU, description, category, image, weight, dimensions, active status); change their own password |
| Pending user | Someone who registered but is not approved yet | Nothing. Login is refused until an ADMIN approves the account |
| Rejected user | A registration an ADMIN turned down (spam, unknown person) | Nothing. Login is refused; the email stays reserved |

The first ADMIN comes from the seeder. In production, a CLI command would create it (described in the Architecture Note, not built).

## 3. Scope

### 3.1 In scope

1. Authentication: register (pending approval), login, logout, protected pages, change password.
2. User management for ADMIN: approve, change role, deactivate, reactivate.
3. Product list with server-side pagination, search, filters, sorting, and loading, empty and error states.
4. Product detail and edit on one page, with a change-history section.
5. Create product.
6. Archive (soft delete) and restore, ADMIN only.
7. Product image upload with fallback display.
8. Unit of measure (one per product, fixed list).
9. Role-based rules, enforced in the API.
10. Audit log of every write, shown per product as "Riwayat perubahan".
11. Responsive, mobile-first UI.
12. Seeder: about 100 products, 10 categories, test accounts, bundled images.
13. README (with Production Gaps), Architecture Note, `.env.example`, migrations, tests.

### 3.2 Out of scope (with reasons, for the Architecture Note)

| Not built | Why | Future design (one line) |
|---|---|---|
| Excel export | Not in the brief; cut to make room for image upload | JSON endpoint plus SheetJS in the browser; at 100k rows, an async job that streams `COPY` output to object storage and returns a signed download link |
| Excel import | Not in the brief; the seeder covers first data load for this test | Static template with dropdowns, parsed in the browser, sent as JSON, insert-only, all-or-nothing, 1,000-row cap |
| Category and unit management screens | Categories are seeded and stable; units are a fixed enum | Admin-only category CRUD; unit lookup table if units must be user-defined |
| Multi-unit conversion (pcs and dus of 40) | Doubles pricing and stock rules | `product_uoms` table with a factor to the base unit |
| Dedicated stock ledger and price history tables | The audit log already stores every price and stock change with unit and reason | `stock_movements` (IN/OUT, conditional decrement, `stockAfter`) and `price_histories`, backfilled from `audit_logs` |
| Global audit log screen | Per-product history covers the shop's need | Admin page with filters by actor, entity and date |
| Forgot password, admin password reset | Needs email delivery | Email reset link with a single-use token |
| Login rate limiting, failed-login tracking | Time | `@nestjs/throttler`, plus audit entries for failed logins |
| Spam-registration prevention, purge of rejected accounts | Admin rejection covers the shop's scale | CAPTCHA (for example Cloudflare Turnstile) and rate limiting on register; a scheduled purge of accounts rejected more than N days ago, keeping their audit rows |
| Mobile app clients | Not in scope; the web admin uses an httpOnly cookie so page JavaScript can never read the token | `AuthGuard` also reads `Authorization: Bearer`, plus a `POST /api/auth/token` login that returns the token in the body (about 10 lines), then refresh tokens and revocation; no other module changes |
| Signing out other sessions after a password change | Dropped to save time | `tokenVersion` column, incremented on password change and compared by the guard on every request |
| Optimistic UI | Admin forms are server-validated; rollbacks add bugs for little gain | Not planned |
| Presigned upload to object storage | Local disk is enough for one server | S3 or R2 presigned PUT; the API stays JSON-only |
| Dockerized API and web apps | Compose runs Postgres only | Dockerfiles plus compose profiles |
| Dark mode, multiple languages | Not needed by the shop | Vuetify theme toggle; vue-i18n |
| Vuetify 4 | Vuetify 3 chosen for familiarity under the time limit | Follow Vuetify's v3 to v4 upgrade guide (Material Design 3 type and elevation, CSS layers, renamed props) |

## 4. Constraints

- **Stack (mandated):** Nuxt 3 + Pinia (frontend), NestJS (backend), PostgreSQL. Separate apps in a pnpm monorepo (`apps/frontend`, `apps/backend`).
- **Libraries (chosen):** Vuetify for UI, Prisma ORM **pinned to 7.x** (npm `latest` is an 8.0 release candidate), `class-validator` with a global `ValidationPipe`.
- **Vuetify version:** Vuetify 3, pinned to `vuetify@^3.13.7`. npm's `latest` tag is now 4.x, so a bare `pnpm add vuetify` would install v4. Set up with the manual Nuxt plugin and `vite-plugin-vuetify`, not `vuetify-nuxt-module` (still a release candidate). The mockup shows the Vuetify 3 look.
- **JSON only:** all requests and responses are JSON. The single exception is `POST /api/uploads/images`, which accepts `multipart/form-data` because it carries a binary file; its response is still JSON.
- **Time:** the brief suggests at most 8 hours. The agreed scope is about 11.5 hours. This must be disclosed in the README under "Time spent", with a `v0.1-core` git tag at the point where the required slice works.
- **UI language:** Indonesian. Code, API field names, commit messages and docs are in English.
- **Brand:** "Klontong Admin", shopping-cart logo, sage green accent. Primary `#5F7A61` (meets 4.5:1 with white text). Pure sage `#9CAF88` fails contrast with white text, so it is used only for decoration (for example the switch track).
- **Nuxt rendering:** `ssr: false` (single-page app). The admin app sits behind a login and needs no SEO; this avoids cookie forwarding and hydration issues.

## 5. Accounts and authentication

### 5.1 Register (public)

- Fields: full name (1–255 characters), email, password (8–128 characters), repeat password (frontend check only).
- Email is trimmed and lowercased; it must be unique (409 if taken).
- The account is created with status `PENDING` and role `STAFF`.
- After submitting, the user sees "Pendaftaran terkirim": an admin must approve the account and choose its role before they can log in.

### 5.2 Login and session

- Email and password. The response sets a JWT in an httpOnly cookie, `SameSite=Lax`, `Secure` in production, valid for 8 hours.
- The browser talks to the API through a same-origin Nuxt proxy (`/api/**` and `/uploads/**`), so there is no CORS setup and the cookie is first-party.
- Messages:
  - Wrong email or password: "Email atau password salah."
  - Pending account: "Akun Anda menunggu persetujuan admin toko."
  - Deactivated account: "Akun Anda dinonaktifkan. Hubungi admin toko."
  - Rejected registration: "Pendaftaran Anda ditolak admin toko." (code `ACCOUNT_REJECTED`)
- The authentication guard is global, with a `@Public()` decorator for the open routes (register, login).
- On every request, the guard loads the user from the database and rejects the request if the user is not `ACTIVE`. Deactivation and role changes therefore apply immediately, not when the token expires.
- Token expiry: the token's `exp` claim is checked on every request. An expired token returns 401 with code `SESSION_EXPIRED`; a tampered or malformed token returns 401 `UNAUTHENTICATED`. The cookie's lifetime equals the token's (`JWT_TTL_SECONDS`), so in a browser the cookie usually disappears at the same moment and the next request gets `UNAUTHENTICATED`. The frontend therefore treats any 401 received while a user was logged in as an ended session: it shows "Sesi berakhir, silakan masuk lagi" and goes to the login page, which then returns to the page the user was on.
- Logout clears the cookie.

### 5.3 Change password

- Open to every logged-in user, from the user menu ("Ganti password").
- Requires the current password (400 "Password saat ini salah" when wrong). The new password must be 8–128 characters and different from the current one.
- Other sessions are **not** signed out: they stay valid until their token expires (8 hours). Listed under Production Gaps; the fix is a `tokenVersion` column, incremented on password change and compared by the guard.
- Audited as `user.password_change`, with no before or after values.

### 5.4 User management (ADMIN only)

- Page "Pengguna" with filter chips: Semua (everyone except rejected), Menunggu, Aktif, Nonaktif, Ditolak (each with a count). The top navigation shows a badge with the number of pending users.
- Table: name, email, role, status, registration date, actions.
- Actions:
  - Pending user: **Setujui**, which opens a dialog to pick STAFF (default) or ADMIN, then sets the status to `ACTIVE`; or **Tolak** (for spam or unknown people), which sets the status to `REJECTED` with a confirmation. A rejected account cannot log in (`ACCOUNT_REJECTED`), cannot register again with the same email (409 `EMAIL_TAKEN`), is hidden from the default list (visible under "Ditolak"), and is audited as `user.reject`. Only `PENDING` accounts can be rejected. A rejection can be reconsidered: approving a `REJECTED` account sets it `ACTIVE` (audited as `user.approve`).
  - Rejected user: **Setujui** (reconsider).
  - Active user: **Ubah peran** (same dialog) and **Nonaktifkan**.
  - Inactive user: **Aktifkan kembali**.
- An admin cannot change their own role or status (409). Combined with the fact that only active admins can act, this guarantees at least one active admin always exists.
- Users are never deleted, because the audit log references them.
- Staff who open the page see "Anda tidak punya akses ke halaman ini". The API returns 403 for every `/api/users` call by a STAFF user.

## 6. Products

### 6.1 Product list

- Columns (desktop): image (40 px), SKU, name, category, price, stock with unit, status, actions.
- Server-side pagination: page sizes 10, 20 and 50; default 10.
- Search: name or SKU, case-insensitive "contains", debounced by 300 ms.
- Filters:
  - Category: all, or one category.
  - Status: all, active, inactive. ADMIN also gets "Diarsipkan" (archived). Without a status filter, archived products are excluded.
- Sorting: last changed (default, newest first), name A–Z, price ascending, price descending, stock ascending.
- Search, filters, sort and page live in the URL query string, so refresh, back and shared links keep the view.
- Stock of 0 is shown in red ("Stok habis" on phones).
- States:
  - Loading: progress bar plus skeleton rows.
  - Empty with filters: "Tidak ada produk yang cocok" with a "Reset filter" button.
  - Empty with no products at all: invitation to add the first product.
  - Error: message plus "Coba lagi".
- Row actions: Lihat and Ubah (both open the detail page; Ubah opens it in edit mode with `?edit=1`), and Arsipkan (ADMIN only, with a confirmation dialog). Archived rows (ADMIN, "Diarsipkan" filter) show Pulihkan instead of Arsipkan.
- "Tambah produk" button (a floating action button on phones).

### 6.2 Product detail and edit (one page)

- Layout: image and form at the top, change history below. No tabs.
- View mode shows all fields read-only. "Ubah" switches the same page to edit mode, with "Batal" and "Simpan".
- In edit mode for STAFF, price, stock and unit are disabled with the hint "Hanya admin yang dapat mengubah".
- **Reason field** ("Alasan perubahan"), shown in edit mode:
  - Optional for STAFF.
  - Required for ADMIN when price, stock or unit changes (400 otherwise).
  - Stored in the audit log and shown in the history.
- **Unit change rule:** changing the unit (ADMIN only) must include the new price, the new stock and a reason in the same request (400 otherwise), because price and stock are counted per unit.
- **Archive:** ADMIN only, with a confirmation dialog. Archiving sets `archivedAt` and `isActive = false`. **Restore** clears `archivedAt` and leaves the product inactive; the admin reactivates it explicitly.
- Archived products are read-only (edit returns 404). STAFF get 404 when they open an archived product. ADMIN see a banner with "Pulihkan".
- **History ("Riwayat perubahan"):**
  - The latest 50 audit entries for this product, newest first, no pagination.
  - Each entry shows the time, actor name and role, action ("Dibuat", "Diubah", "Diarsipkan", "Dipulihkan"), the changed fields as "label: old → new", and the reason.
  - Changed fields are computed in the frontend by comparing `before` and `after` on a fixed list of business fields (name, SKU, price, stock, unit, category, active status, description, image, weight, dimensions). Timestamps are not shown as changes.
  - IP address and user agent are never returned by this endpoint.

### 6.3 Create product

- Same fields as edit, all on one page (a full-screen dialog layout on phones).
- Required: SKU, name, category, unit, price, initial stock, weight, length, width, height. Optional: image, description.
- Defaults: unit `PCS`, stock 0, active.
- STAFF can set the initial price, stock and unit. Creating is not editing, so the ADMIN-only rule does not apply. The audit log records who created the product with which values.

### 6.4 Image upload and fallback

- Images come **only** from upload. There is no image URL field.
- The image is uploaded as soon as it is chosen, to `POST /api/uploads/images`. The response is JSON: `{ "data": { "url": "/uploads/products/<uuid>.webp" } }`. The product is then saved as JSON with that path.
- Accepted: JPEG, PNG and WebP, at most 2 MB. The type is checked from the file's first bytes, not from its name or MIME header. No SVG.
  - JPEG starts with `FF D8 FF`.
  - PNG starts with `89 50 4E 47 0D 0A 1A 0A`.
  - WebP is `RIFF` followed by `WEBP` at byte 8.
- Files are received in memory (Multer `memoryStorage`, limit 2 MB, one file), checked, then written to `UPLOAD_DIR/products/<crypto.randomUUID()>.<ext>`. The server picks every file name.
- Served by the backend with `app.useStaticAssets` under `/uploads`, with long cache headers (names never change), `index: false`, `dotfiles: 'deny'`, and `X-Content-Type-Options: nosniff`. Image URLs are public; images are not sensitive.
- The product `image` field accepts only `null` or a path matching `^/uploads/products/[0-9a-f-]{36}\.(jpg|png|webp)$`, and the file must exist in `UPLOAD_DIR` (400 otherwise).
- Errors: wrong type (415), more than 2 MB (413), not logged in (401). The frontend also checks type and size before uploading, for fast feedback.
- "Hapus" sets the image to `null`.
- **Fallback:** when a product has no image, or the file cannot be loaded, the UI shows a neutral tile with an "image off" icon. This is the brief's "Image fallback handling".
- Known gaps (Production Gaps): orphaned files when an upload is never saved or is replaced; local disk does not survive multiple servers or lost volumes; no upload rate limit.

### 6.5 Unit of measure

- One unit per product, from a fixed enum shown with Indonesian labels:

| Code | Label |
|---|---|
| PCS | Pcs |
| PACK | Pak |
| BOX | Dus |
| BOTTLE | Botol |
| CAN | Kaleng |
| SACHET | Sachet |
| STRIP | Renceng |
| SACK | Karung |

- Price, stock, weight and dimensions are all per one unit.
- Only countable units exist, because stock is an integer. Goods sold loose by weight or volume (per kilogram, per liter) are out of scope; they would need a decimal stock column.

## 7. Audit log

- One row for **every write**: `user.register`, `user.approve`, `user.reject`, `user.update` (role or status), `user.password_change`, `product.create`, `product.update`, `product.archive`, `product.restore`.
- Written in the **same database transaction** as the change, through one helper (`audit.log(tx, actor, entry)`) that every service calls.
- Stores: actor, action, entity type and id, full `before` and `after` state as JSON, reason, IP, user agent, timestamp.
- **Never stores password hashes.** User snapshots leave that field out; password changes store no before or after.
- Append-only: no endpoint updates or deletes audit rows. (Production: a database role without UPDATE or DELETE rights on the table.)
- The actor is always taken from the authenticated user, never from the request body.
- Uploads themselves are not audited; the image change is captured by `product.update`.
- Seeded data has no audit rows. The README says so.

## 8. Responsive and mobile-first behaviour

Phone layouts (below Vuetify's `sm` breakpoint, about 600 px) follow the mockup's "Ponsel" row:

- Top app bar with a hamburger button that opens a navigation drawer (Produk, Pengguna for ADMIN, Ganti password, Keluar). Only the avatar shows in the bar.
- Product list as a `v-list`: 56 px image, two-line name, SKU and category, price, stock, status. A ⋮ menu per row holds Lihat, Ubah and Arsipkan.
- Filters as horizontally scrolling chips that each open a bottom sheet with options.
- "Tambah" as a floating action button.
- Detail, edit and create in one column. Create and edit use the full-screen dialog pattern (close, title, Simpan in the top bar). History as cards.
- Touch targets at least 48 px.

Desktop keeps the tables and multi-column forms. Tables scroll horizontally inside their card if the window is narrow but not yet phone-sized.

## 9. Data model

### 9.1 Tables

**users**: `id`, `email` (unique, lowercase), `name`, `password` (always an argon2id hash, never plain text; never selected except at login), `role` (`ADMIN` | `STAFF`, default `STAFF`), `status` (`PENDING` | `ACTIVE` | `INACTIVE` | `REJECTED`, default `PENDING`), `created_at`, `updated_at`.

**categories**: `id`, `name` (unique), `created_at`. Seeded only.

**products**:

| Column | Type | Notes |
|---|---|---|
| `id` | int, auto | |
| `sku` | varchar(50), unique | Uppercase; unique including archived products |
| `name` | varchar(255) | |
| `description` | text, nullable | |
| `category_id` | int, FK to categories | `ON DELETE RESTRICT`, indexed |
| `uom` | enum, default `PCS` | Section 6.5 |
| `price` | int | Rupiah per unit, whole number |
| `stock` | int, default 0 | |
| `weight` | numeric(12,4) | Kilograms per unit, up to 4 decimals (for example 0.085) |
| `length`, `width`, `height` | numeric(12,2) | Centimetres per unit, up to 2 decimals (for example 14.5) |
| `image` | varchar(255), nullable | `/uploads/products/<uuid>.<ext>` |
| `is_active` | boolean, default true | On sale or not |
| `archived_at` | timestamptz, nullable | Soft delete |
| `created_at`, `updated_at` | timestamptz | |
| `created_by_id`, `updated_by_id` | int, FK to users | `ON DELETE RESTRICT`; set from the logged-in user on every write; the audit log keeps the full history |

**audit_logs**: `id`, `actor_id` (FK to users, nullable for system actions), `action` varchar(50), `entity_type` varchar(30), `entity_id` int, `before` jsonb, `after` jsonb, `reason` varchar(200), `ip` varchar(45), `user_agent` varchar(255), `created_at`. Indexes on (`entity_type`, `entity_id`, `created_at`) and (`actor_id`, `created_at`).

Database names are snake_case (Prisma `@map` / `@@map`); code uses camelCase.

### 9.2 Database constraints (added by hand in the migration SQL)

| Constraint | Rule |
|---|---|
| `products_price_nonneg` | `price >= 0` |
| `products_stock_nonneg` | `stock >= 0` (negative stock is never allowed) |
| `products_size_positive` | `weight`, `width`, `length`, `height` all `> 0` |
| `products_sku_format` | `sku ~ '^[A-Z0-9-]{3,50}$'` |
| `products_name_not_blank` | `btrim(name) <> ''` |
| `products_archived_inactive` | `archived_at IS NULL OR is_active = false` |
| `users_email_lowercase` | `email = lower(email)` |
| `categories_name_not_blank` | `btrim(name) <> ''` |

Prisma does not manage CHECK constraints, so later migrations do not drop them. The DTOs validate the same rules first, so users see readable 400 errors; the constraints are the safety net.

### 9.3 Why these choices

- Category is its own table. The API still returns `categoryName`, matching the brief's sample.
- Price is an integer in rupiah, never a float.
- Weight and dimensions are exact decimals (`numeric`), not floats. Prisma returns them as `Decimal` objects, which would serialize to JSON strings; the response mapper converts them to JSON numbers (safe at 3 decimals). In the UI they use the Indonesian decimal comma (`3,4`), converted to a dot before sending. The brief's sample uses whole numbers; decimals were chosen because real package sizes are not whole centimetres, and to show deliberate decimal handling next to integer money.
- `isActive` (on sale) and `archivedAt` (soft-deleted) are separate states.
- SKUs stay unique after archiving, so a SKU is never reused with a different meaning.
- Integer ids match the brief's sample; the app is behind a login, so guessable ids are acceptable.

## 10. API contract

### 10.1 Conventions

- Base path `/api`. JSON in and out (except the upload request).
- Single item: `{ "data": { ... } }`. List: `{ "data": [ ... ], "meta": { "page", "pageSize", "total", "totalPages" } }`.
- Product field names match the brief's sample exactly: `id`, `categoryId`, `categoryName`, `sku`, `name`, `description`, `weight`, `width`, `length`, `height`, `image`, `price`, `isActive`, `stock`. Added fields: `uom`, `archivedAt`, `createdAt`, `updatedAt`. Documented differences: `image` holds a server path (`/uploads/products/<uuid>.webp`) or `null`, not an external URL; `weight` is in kilograms with decimals (the sample's `500` grams becomes `0.5`), and dimensions are centimetres with one decimal. All are JSON numbers.
- Errors: `{ "statusCode", "error", "code", "message", "details"? }`. `code` is a stable machine code (for example `SKU_TAKEN`, `ACCOUNT_PENDING`); `details` lists field errors as `[{ "field", "message" }]`. The frontend shows Indonesian text based on `code` and `field`.
- Validation: global `ValidationPipe` with `whitelist`, `forbidNonWhitelisted` and `transform`. Unknown fields return 400.
- `sort` accepts only the listed fields; `pageSize` is capped at 50.
- One exception filter maps Prisma errors: unique violation (`P2002`) to 409, missing foreign key (`P2003`) to 400, record not found (`P2025`) to 404.

### 10.2 Endpoints

| Method and path | Access | Notes |
|---|---|---|
| `POST /api/auth/register` | Public | 201, status `PENDING` |
| `POST /api/auth/login` | Public | Sets the cookie; 401 wrong credentials; 403 with `ACCOUNT_PENDING` or `ACCOUNT_INACTIVE` |
| `POST /api/auth/logout` | Logged in | 204, clears the cookie |
| `GET /api/auth/me` | Logged in | Current user: id, name, email, role |
| `PATCH /api/auth/password` | Logged in | `{ currentPassword, newPassword }` |
| `GET /api/users?status=&page=&pageSize=` | ADMIN | Without `status`, rejected accounts are excluded |
| `PATCH /api/users/:id` | ADMIN | `{ role?, status? }`; approve is `status: ACTIVE` plus `role`; reject is `status: REJECTED` (only from `PENDING`, else 400 `INVALID_STATUS_CHANGE`); 409 on self |
| `GET /api/categories` | Logged in | |
| `GET /api/products?page=&pageSize=&search=&categoryId=&status=&sort=&order=` | Logged in | `status` = `active` \| `inactive` \| `archived`; `archived` is ADMIN only (403 for STAFF) |
| `GET /api/products/:id` | Logged in | Includes `categoryName`; archived products are 404 for STAFF |
| `POST /api/products` | Logged in | 409 `SKU_TAKEN` |
| `PATCH /api/products/:id` | Logged in | Field rules in section 6.2; 403 `ADMIN_ONLY_FIELDS` when STAFF change price, stock or unit (compared with current values, not field presence) |
| `DELETE /api/products/:id` | ADMIN | Archives (soft delete); 204 |
| `POST /api/products/:id/restore` | ADMIN | |
| `GET /api/products/:id/history` | Logged in | Latest 50 audit entries; no IP or user agent |
| `POST /api/uploads/images` | Logged in | Multipart field `file`; the only non-JSON request |
| `GET /uploads/products/*` | Public | Static files |

## 11. Validation rules

| Field | Rule |
|---|---|
| `sku` | Required; trimmed and uppercased; `^[A-Z0-9-]{3,50}$`; unique |
| `name` (product) | Required; trimmed; 1–255 characters |
| `description` | Optional; at most 2,000 characters |
| `categoryId` | Required; must exist |
| `uom` | One of the enum values |
| `price` | Integer, 0 to 1,000,000,000 |
| `stock` | Integer, 0 to 1,000,000 |
| `weight` | Number, 0.0001 to 100 kg, at most 4 decimals |
| `length`, `width`, `height` | Number, 0.01 to 500 cm, at most 2 decimals |
| `isActive` | Boolean |
| `image` | `null` or an uploaded path (section 6.4) |
| `reason` | Optional, at most 200 characters; required for ADMIN when price, stock or unit change |
| `email` | Required; valid; at most 254 characters; lowercased; unique |
| `name` (user) | Required; 1–255 characters |
| `password` | 8–128 characters |

## 12. Non-functional requirements

- **Security:** passwords hashed with argon2id (`argon2` package); global authentication guard; every role rule enforced in the API, not only hidden in the UI; upload checks from section 6.4; no secrets in the audit log; `.env` never committed.
- **Accessibility:** every input has a label; icon-only buttons have `aria-label`; text contrast at least 4.5:1; visible keyboard focus; dialogs are labelled; touch targets at least 48 px on phones.
- **Performance:** product list API under 300 ms locally with the seeded data; images have `width`, `height` and `loading="lazy"`; the 100k-product plan is in the Architecture Note.
- **Browsers:** current Chrome, Edge, Firefox and Safari, and Chrome on Android.

## 13. Seed data

- 10 categories with Indonesian names: Makanan Ringan, Mi Instan, Minuman, Beras dan Tepung, Minyak Goreng, Bumbu Dapur, Susu dan Olahan, Perawatan Diri, Kebersihan Rumah, Makanan Beku.
- 100 products: a hand-written list of 10 real shop items per category. SKUs are a category prefix plus a number (for example `SNK-0001`).
- Stock, active state and archived state vary deterministically by row index, so every run produces the same data: some products have 0 stock, about 10 are inactive, 4 are archived (and therefore inactive).
- Images: 10 AI-generated product photos (one per category; Stable Diffusion XL through a local ComfyUI; generic, unbranded packaging) in `apps/backend/prisma/seed-images/`, copied into `UPLOAD_DIR` under fixed UUID names. About 10 products have no image, to show the fallback.
- Users (password from `SEED_USER_PASSWORD`, default documented in the README):
  - `admin@klontong.test`: ADMIN, ACTIVE
  - `staff@klontong.test`: STAFF, ACTIVE
  - `pending@klontong.test`: STAFF, PENDING
- Safe to re-run: upserts for categories and users (resetting the test passwords), `createMany` with `skipDuplicates` for products.
- Refuses to run when `NODE_ENV=production`.
- Prisma 7 does not run the seed automatically; the README lists `pnpm db:seed` as its own step.

## 13a. Environment variables

`DATABASE_URL`, `DATABASE_URL_TEST` (e2e tests), `JWT_SECRET` (at least 32 characters), `JWT_TTL_SECONDS` (default `28800`, used for both token and cookie), `PORT` (backend, 3001), `COOKIE_SECURE`, `UPLOAD_DIR` (default `./uploads`; the 2 MB upload limit is a constant in code), `SEED_USER_PASSWORD`, `NUXT_API_BASE` (proxy target), and `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` for docker-compose. All listed in the root `.env.example`.

## 14. Acceptance tests (backend e2e, against a real Postgres test database)

1. Register returns 201 with status `PENDING`; logging in with that account returns 403 `ACCOUNT_PENDING`.
2. ADMIN approves the user as STAFF; the user can then log in.
2b. ADMIN rejects a pending registration: login gets 403 `ACCOUNT_REJECTED`, registering the same email again gets 409, the account is missing from the default list but present under `status=REJECTED`, and rejecting a non-pending account gets 400.
3. ADMIN cannot change their own role or status (409).
4. STAFF calling `GET /api/users` gets 403.
5. Deactivating a user makes their existing session fail on the next request (401).
6. Change password: wrong current password gives 400; after a change, the old password fails to log in (401) and the new one works.
6a. An expired token gets 401 `SESSION_EXPIRED`; a tampered token gets 401 `UNAUTHENTICATED`.
7. Create product as STAFF with price and stock: 201; the history shows "Dibuat" by that user.
8. Duplicate SKU: 409 `SKU_TAKEN`.
9. STAFF saves the full form with an unchanged price and a new name: 200.
10. STAFF changes the price: 403.
11. ADMIN changes the price without a reason: 400; with a reason: 200, and the history entry contains the old price, the new price and the reason.
12. ADMIN changes the unit without restating price and stock: 400.
13. `stock: -1` returns 400; a raw SQL update to a negative stock fails (proves the CHECK constraint).
14. STAFF archives: 403. ADMIN archives: the product leaves the default list; STAFF get 404 on it; ADMIN restores it.
15. List: search by SKU and by name, filter by category and status, sort by price, pagination `meta` correct.
16. Upload: valid PNG gives 201 and the file is served as `image/png`; a text file renamed to `.png` gives 415; 3 MB gives 413; not logged in gives 401.
17. History responses contain no `ip` or `userAgent` fields.

Unit tests: list query mapping (search, filters, sort whitelist, page maths); the history diff helper in the frontend.

## 15. Decisions made after review

1. **Vuetify 3, not 4.** Vuetify 4 (4.3.0) is the current stable release and would also install on Nuxt 3.21, but Vuetify 3 is kept for familiarity and lower risk under the time limit. v3 is still maintained on npm's `v3-stable` tag. For the Architecture Note: "Vuetify 3 chosen for familiarity under the time limit; migrating to Vuetify 4 (Material Design 3, CSS layers, smaller breakpoints) is future work."
2. **AI assistance is disclosed in the README.** The brief says nothing about it. The README states, in one line: "This PRD and the UI mockup were drafted with help from an AI assistant (Claude), and the seed product images were generated with Stable Diffusion XL; all application code was written by me."

## 16. Delivery plan

| Item | Estimate |
|---|---|
| Required features and docs | ~6.5 h |
| Unit of measure | ~0.3 h |
| Roles and ADMIN-only fields | ~0.5 h |
| Audit log and "Riwayat perubahan" | ~1.0 h |
| Approval flow and Users menu | ~1.0 h |
| Change password | ~0.4 h |
| Image upload (including seed images) | ~1.0 h |
| Mobile-first layouts | ~0.5 h |
| **Total** | **~11.2–11.5 h** |

- **Repository:** GitHub, `Kenzo03/klontong-admin`. Reviewers must be able to open it: either public, or private with access granted to them. No deployment is required.
- **Time tracking:** the candidate writes the code and records real start and end times; the README's "Time spent" reports those actual hours, not this estimate.
- Branches per milestone (`chore/setup`, `feat/api-auth`, `feat/api-products`, `feat/web-auth`, `feat/web-products`, `docs/handoff`), merged with merge commits, not squash. Milestone pull requests are the author's working style, not a brief requirement.
- Tag `v0.1-core` when the required slice works; tag `v1.0.0` for submission.
- **Cut order if behind schedule:** approval flow first (Register then creates an ACTIVE STAFF directly; the Users menu stays for roles and deactivation), then change password, then image upload (fall back to a URL field plus fallback). Required features and documentation are never cut.
- Submit by the morning of 2026-10-23, leaving a buffer before 15:40 WIB.

## 17. Calls left to the builder

- Exact component structure, composable names and Pinia store layout, as long as API access goes through a service layer or composables and auth state lives in Pinia.
- Exact Indonesian wording of messages not quoted in this document.
- Exact skeleton, empty-state and snackbar styling, following the mockup.
- Whether to use a `v-data-table` (desktop) and `v-list` (phone) or one component with Vuetify's built-in mobile mode, as long as the phone layout matches section 8.
