# MandiMitra

A farmer procurement application for booking mandi visits, following queues, and recording weighing, procurement, and external payment references.

**[Open MandiMitra](https://mandimitra.work.gd)** · [Visitor guide](docs/LIVE_SITE.md) · [Local setup](docs/DEVELOPMENT.md) · [Deployment](docs/DEPLOYMENT.md) · [Security](SECURITY.md)

**Status:** deployed portfolio/pilot application. Government integration, bank settlement, and a field-tested production rollout are not included. The public repository contains frontend and backend source, not live database records or hosting credentials.

## What works

| Area | Implemented | Boundary |
| --- | --- | --- |
| Accounts | ChatGPT sign-in, persistent profiles, administrator and centre-scoped staff roles | Production identity requires the Sites authentication gateway |
| Farmer workflow | Profile verification, crop registration, slot booking, printable passes | Staff must verify the farmer before booking |
| Capacity | Atomic slot limits, idempotent booking, one non-cancelled token per farmer/day and per crop lot | Fourteen-day window; weekly opening days and hours; no date-specific holiday exceptions |
| Queue | Check-in, staff calling, desk limits, polling and waiting-time estimates | Polls every 15 seconds, or 60 seconds in low-data mode; estimates are not guarantees |
| Procurement | Accepted weight, agreed rate, integer-paise totals and event history | Staff enter actual procurement details |
| Payments | Records a staff-entered reference for an external payment | Does not transfer money or verify bank settlement |
| Languages | English/Hindi interface labels and crop/status names | User content and some validation errors are not translated |
| Load estimates | Booking counts and a same-weekday historical baseline | Not a trained ML model; a baseline needs at least three recorded days |

No official mandi directory or sample procurement data is seeded into production. An empty centre list means an operator has not configured an active centre.

## Try the application

1. Open the [website](https://mandimitra.work.gd). Public browsing does not grant staff access.
2. Sign in with ChatGPT and complete your profile when you need account features.
3. Choose an available verification centre. Booking requires in-person verification by that centre's staff.
4. Register a crop lot, book a future available slot, and use your pass to follow the queue.

The live site stores submitted records. For experiments or screenshots containing invented people, use the isolated local setup instead. See the [visitor guide](docs/LIVE_SITE.md) for access limits, domain status, and troubleshooting.

## Run locally

Use **Node.js 24 LTS** and **pnpm 11.25.0**. See [the complete setup guide](docs/DEVELOPMENT.md), including installation prerequisites and the local sign-in limitation.

```bash
git clone https://github.com/patelyuvraj1133-commits/farmer-project.git
cd farmer-project
pnpm install --frozen-lockfile
node -e "require('node:fs').copyFileSync('.env.example', '.env')"
pnpm db:migrate:local
pnpm dev
```

Open the localhost URL printed by the development server. The template keeps administrator bootstrap disabled. Follow the guide's **local-only administrator setup** before testing operator workflows.

```bash
pnpm test
pnpm typecheck
pnpm build
```

A GitHub upload does not deploy this backend. GitHub Pages cannot run its API or D1 database. [Deployment instructions](docs/DEPLOYMENT.md) describe the supported Sites route and the requirements for another host.

## Architecture and source map

The application uses React, TypeScript, Tailwind, Next-style App Router code through **Vinext/Vite**, Cloudflare Workers, Cloudflare D1/SQLite, and Drizzle migrations.

| Path | Purpose |
| --- | --- |
| `app/`, `components/` | Pages, account/workflow screens and UI components |
| `app/api/[...path]/route.ts` | HTTP entry point |
| `app/chatgpt-auth.ts` | Reads identity supplied by the trusted hosting gateway |
| `lib/service.ts`, `lib/domain.ts` | Authorization, SQL operations and business rules |
| `db/` | Schema and runtime database adapters |
| `drizzle/` | Reviewed SQL migrations and migration metadata |
| `tests/service.test.mjs` | Integration tests against the actual service and SQLite schema |
| `scripts/`, `build/` | Local setup, build and hosting support |
| `.github/workflows/` | Automated verification and secret scanning |
| `.env.example` | Non-secret configuration template |

The original proposal referenced `Mandimitra@SIH.pdf`; that document is not included in this repository. This implementation uses Workers/D1 rather than the proposal's Node/Express, MongoDB, Redis, Python/XGBoost, Firebase, Vercel or Railway stack.

## Validation and remaining work

The backend suite exercises service authorization, bootstrap behavior, profile verification, bookings, concurrency boundaries, queue fairness, cancellations, monetary calculations and event history. It uses SQLite with a D1-compatible adapter. It does **not** prove production D1 throughput, the hosting gateway's authentication behavior, or end-to-end browser compatibility.

[GitHub Actions](https://github.com/patelyuvraj1133-commits/farmer-project/actions) runs tests, type checking, a production build, local migration checks, and Gitleaks. Read the run result for the commit you are evaluating; the existence of a workflow is not evidence that it passed.

Before operational use, the project still needs:

- Date-specific holiday closures and evaluation of the historical estimates.
- SMS/IVR/background notifications, if required.
- Government procurement feeds, permissions and operator onboarding.
- Payment-provider settlement and reconciliation, if required.
- An identity option suitable for farmers who cannot use ChatGPT.
- Multi-user browser testing, load testing, monitoring and backup/restore drills.

## Support and reuse

Use [GitHub Issues](https://github.com/patelyuvraj1133-commits/farmer-project/issues) for bugs without private records. Follow [SECURITY.md](SECURITY.md) for vulnerabilities and [the data-handling notes](docs/DATA_HANDLING.md) before collecting real farmer information.

Project source remains all rights reserved; see [LICENSE](LICENSE). Bundled third-party components retain their own licenses. A public repository is not a claim of government endorsement or production certification.
