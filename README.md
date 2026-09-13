# MandiMitra

Website: [mandimitra.work.gd](https://mandimitra.work.gd)

## Source code map

- `app/` and `components/`: frontend pages and UI.
- `app/api/[...path]/route.ts`: backend HTTP entry point.
- `lib/service.ts`: backend business logic and authorization.
- `db/`: database schema and runtime adapter.
- `drizzle/`: SQL migrations.
- `tests/service.test.mjs`: backend integration tests.
- `.env.example`: configuration template without credentials.

This repository contains application source, not the hosted database contents or runtime credentials. Hosting and ChatGPT authentication require the existing Sites environment or adaptation for a different host. Uploading this code to GitHub does not move the running backend to GitHub Pages.

A deployed procurement application based on `Mandimitra@SIH.pdf`. Real records start empty. Automated verification fixtures are isolated in an in-memory test database and are never seeded into the live application.

## First use

1. Open the private site as its owner, sign in with ChatGPT, and complete the profile. While `BOOTSTRAP_ADMIN_ENABLED=true` and the database has no users, this first authenticated registration becomes the sole administrator. The site must remain owner-private until that registration is complete. Do not use this bootstrap mode on an uninitialised public site.
2. In **Manage mandis**, add a centre you are authorised to operate. Enter its actual address and coordinates, working days and hours, accepted crops, hourly capacity, desks, and processing-time estimate.
3. After the administrator has been registered, turn off `BOOTSTRAP_ADMIN_ENABLED` before widening site access. Manage site access and custom DNS through the hosting provider. Signing into the app alone does not override the site's hosting access policy.
4. Farmers register profiles and select a verification centre. The administrator can assign existing accounts as staff at one centre. Staff verify farmers in person.
5. Farmers register a crop lot and book an available slot. Staff check them in on their appointment date, call the next arrival, weigh, record procurement, and record an actual external payment reference.

## Implemented workflows

- English and Hindi interface labels, crop names, and status labels; user-entered content and some server validation errors remain in their original language.
- Authenticated, persistent profiles, scoped staff roles, in-person farmer verification, and crop registration.
- Atomic hourly capacity checks, one non-cancelled token per farmer per day, one non-cancelled procurement per registered lot, and idempotent booking keys.
- Fourteen-day booking window with Indian Standard Time dates; configured holidays/working days and opening hours.
- Mandi comparison by actual booked capacity, optional browser geolocation, and Haversine straight-line distance. No unverified official mandi directory is seeded.
- Actual booking load plus a same-weekday historical baseline when at least three recorded days exist. This baseline is labelled as an estimate; it is not a trained ML model.
- Queue updates every 15 seconds (60 seconds in low-data mode), paused when the document is hidden. ETA uses recent measured service durations once five usable samples exist; otherwise it uses the configured duration. Unfinished checked-in queues carry over midnight.
- Staff queue order, desk-capacity checks, weighing, accepted weight, agreed rate, integer-paise totals, and externally completed payment records.
- Versioned procurement events, user-owned in-app notifications, cancellation before check-in, and printable passes/records.
- Cross-origin write protection, server-side role/ownership checks, parameterised SQL, validation, bounded queries, indexes, and recoverable errors.

## Infrastructure and external dependencies

This deployed implementation uses React, Tailwind, Cloudflare Workers, D1, and hosting-provided ChatGPT authentication. It adapts the proposed infrastructure in the PDF: it does not deploy Node/Express, MongoDB Atlas, Redis/WebSockets, JWT accounts, Python/XGBoost, Firebase, Vercel, or Railway.

The following need actual service accounts, credentials, data, and operational onboarding before a full public production rollout:

- SMS, IVR, Firebase/background push notifications.
- Government procurement/FCI/e-NAM feeds and official approvals.
- Banking or payment gateway settlement and reconciliation. The existing payment action only records an external transfer; it never sends funds or confirms bank settlement.
- Historical arrival data and evaluation for a trained rush-prediction model.
- Public farmer-friendly identity/OTP requirements if ChatGPT sign-in is unsuitable.
- A user-owned custom domain and DNS configuration, if the provided hosting URL is not the desired address.

The application never labels invented queue values as live and never marks payments automatically.

## Development

Preserve the existing pnpm lockfile. Hosting identity and logical database binding are in `.openai/hosting.json`; runtime configuration belongs in hosting environment settings, not the manifest or source control. `.env.example` lists the bootstrap key without secrets.

- Generate schema migrations: `node node_modules/drizzle-kit/bin.cjs generate`.
- Type check: `node node_modules/typescript/bin/tsc --noEmit`.
- Backend verification: `node --test tests/service.test.mjs` (Node 24; uses the actual service and generated schema through a SQLite-backed D1 adapter).
- Build with the Sites `build-site.mjs` helper. Preserve `sites()` in the existing Vite configuration.

Production schema changes use reviewed Drizzle migrations. Once deployed, existing migration files and metadata are immutable. Do not seed examples into production. Runtime handlers do not create or alter tables.

## Validation scope

Thirteen backend integration tests cover authentication boundaries, CSRF rejection, scoped access, registration and verification, queue fairness, desk capacity, idempotency, concurrent booking limits, stale updates, cancellations, money calculations, payment history, notifications, midnight carryover, and concurrent schedule changes. The original build documentation reports passing TypeScript checks and production build; these checks were not rerun during this source export.

Tests exercise the actual SQL against SQLite with a D1-compatible adapter; they are not a measurement of production D1 throughput or a substitute for a multi-user live pilot. Browser/end-to-end UI testing was not performed in this session. The optional `read_my_procurement_records` WebMCP tool is feature-detected, read-only, and reuses displayed state; a supported permitted WebMCP runtime was unavailable for validation.

No software can promise zero defects, zero latency, or unlimited peak traffic. Actual capacity, field adoption, identity requirements, and connected integrations must be validated before operational rollout.
