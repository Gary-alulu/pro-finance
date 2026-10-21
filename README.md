# ProFinance

A single-owner personal finance command centre: assets, liabilities, investments, transactions, documents, and the relationships between them — with an integrity layer that tells you what is missing, stale, or overdue.

Built with Next.js (App Router), MongoDB, and Auth.js (credentials-only, single owner).

## Product principles

- **Missing ≠ zero.** A valuation you never recorded is an error, not a 0.00.
- **Overdue ≠ upcoming.** A matured loan is a different problem from one maturing next week.
- **No 1:1 FX.** Multi-currency values only convert through an explicit dated exchange rate. Anything else is flagged, never assumed.
- **Approval gates AI.** Document extraction proposes; you approve. Nothing extracted becomes official without explicit user approval.
- **Everything important is audited.** Creates, updates, deletes, approvals, and exports land in an append-only audit trail.

## Feature map

| Area | What it does |
| --- | --- |
| `/overview` | Net worth, account totals, accountability pulse, needs-attention list |
| `/assets` | Assets & liabilities with valuation tracking, freshness, debt maturity |
| `/investments` | Holdings, cost basis, average-cost trade math, dividends, price history |
| `/transactions` | Ledger with evidence-status tracking and linked records |
| `/documents` | Upload → AI extraction → review studio → approve/commit to official records |
| `/map` | Visual graph of records and their relationships (secured-by, evidences, held-in…) |
| `/reports` | Full tabular reports per entity with CSV export (formula-injection safe) |
| `/accountability` | Integrity scan: stale valuations, missing evidence, overdue maturities, duplicates, dangling links |
| `/login`, `/register` | Split-screen auth with animated hero, icon inputs, live password-rule feedback |
| Command palette | `Ctrl/Cmd+K` — navigate, quick actions, live record search |

## Getting started

### Prerequisites

- Node.js 20+
- MongoDB running locally (or a connection string to a remote instance)

### Setup

```bash
cp .env.example .env.local   # then edit values
npm install
npm run dev
```

Open http://localhost:3000 and register the **first (and only) user**. Registration is locked once any account exists — this is a single-owner application.

### Environment variables (`.env.local`)

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | MongoDB connection string (e.g. `mongodb://127.0.0.1:27017/profinance`) |
| `NEXTAUTH_URL` | Canonical URL of the app (e.g. `http://localhost:3000`) |
| `NEXTAUTH_SECRET` | JWT/session encryption secret — generate with `openssl rand -base64 48` and keep server-side |
| `AI_PROVIDER` | Document extraction provider (currently `gemini`) |

### Scripts

```bash
npm run dev     # development server (Turbopack)
npm run build   # production build
npm start       # production server
npm test        # unit tests (node --test) — money math, accountability engine, CSV, sanitization
npm run lint    # eslint
```

## Architecture notes

- `app/(app)/*` — authenticated pages; `app/api/*` — JSON route handlers (all enforce `requireUserId()`).
- `auth.js` — Auth.js v5 config: credentials provider, JWT sessions, login rate-limiting (5 fails / 15 min → 15 min lockout), proxy-level fail-closed page protection.
- `proxy.js` — redirects unauthenticated page traffic to `/login`; API routes return JSON 401s from their handlers.
- `lib/finance/` — Decimal.js money math (average cost, market value, cashflow, FX).
- `lib/accountability/engine.js` — pure integrity checks (unit-tested).
- `lib/reports/` — report building + RFC 4180 CSV with formula-injection guard.
- `lib/db/models/` — Mongoose models; Decimal128 for money; `ownerId` on every record.
- `lib/auth/session.js` — `requireUserId()`, `assertOwnership()`, `assertOwnedRef()` (foreign keys must be owned), `withErrorHandling()`.
- `lib/validations/schemas.js` — shared zod schemas for every mutation (server-validated, client-used for form errors).
- `lib/security/sanitize.js` — server-side input sanitization applied to every JSON request body.

### Request pipeline (every mutating endpoint)

```
JSON body → readJsonBody (sanitize) → zod schema (validate + coerce) → ObjectId cast → assertOwnedRef (ownership) → write → logAudit
```

- **Sanitize**: HTML tags and control characters stripped, whitespace normalized; `/password/i` keys are never rewritten so register/login always hash the identical secret; monetary strings pass through untouched.
- **Validate**: zod rejects unknown types, trims text, enforces length caps (e.g. passwords ≤ 128), whitelists currency codes and enums. Malformed JSON returns 400, not 500.
- **Cast/own**: ids become `ObjectId`s (invalid → 400); every foreign key is checked for ownership before it is used in a write.

### Security posture

- Single-owner registration is atomic at the database level (partial unique index).
- All `[id]` routes assert record ownership; client-supplied foreign keys (linked asset/account/document ids) are verified with `assertOwnedRef` before writes.
- **Input injection**: no SQL layer exists (MongoDB only); every query uses typed object syntax — values are bound, never parsed as query syntax. Login credentials are strictly type-checked (blocks `{"$gt": ""}` operator injection); search regexes are escaped before `$regex`; aggregations interpolate no user input.
- **Input sanitization**: all JSON bodies are deep-sanitized server-side (tags/control chars stripped, whitespace normalized) before validation — defense-in-depth on top of React's output escaping.
- **Input validation**: shared zod schemas on every mutation — type checks, trimmed text, length caps, currency/enum whitelists; malformed JSON returns 400.
- Security headers on every response (CSP, nosniff, frame-deny, referrer policy, permissions policy; HSTS in production).
- Login rate limiting (5 fails / 15 min → 15 min lockout) is in-memory — single instance only. Multi-instance deployments need a shared store (e.g. Redis).
- File downloads: sanitized `Content-Disposition` (ASCII fallback + RFC 5987 `filename*`) and `nosniff`.
- Audit IPs are taken from the right-most (trusted proxy) `x-forwarded-for` hop.

## Testing

```bash
npm test
```

Covers: missing-vs-zero valuation semantics, overdue-vs-upcoming maturity, average-cost trade math, dividend tracking, FX conversion rules, recorded net worth, accountability findings/reminders, CSV quoting and formula-injection guard, input sanitization (tag/control-char stripping, password-key preservation).
