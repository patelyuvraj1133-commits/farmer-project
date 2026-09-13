# Local development

## Prerequisites

- Node.js **24 LTS** (also recorded in `.nvmrc`). The tests use `node:sqlite`.
- Git and pnpm **11.25.0**, matching `package.json`.
- Network access to the npm registry for the first installation.

If pnpm is missing, install the pinned version with `npm install --global pnpm@11.25.0`. Use your normal Node installation; administrator access is not required by the project.

## Fresh checkout

```bash
git clone https://github.com/patelyuvraj1133-commits/farmer-project.git
cd farmer-project
pnpm install --frozen-lockfile
node -e "require('node:fs').copyFileSync('.env.example', '.env')"
pnpm db:migrate:local
pnpm dev
```

The copy command is for a fresh checkout: do not overwrite an existing environment file. Open the localhost address printed by the server (normally port 5173). Keep the development server on your own machine.

`db:migrate:local` runs Wrangler migrations with a generated local-only configuration, the same placeholder D1 ID as Vite, and persistence under `.wrangler/state`. It has no remote mode and needs no Cloudflare credentials. Re-running it skips applied migrations; it does not reset or seed records.

## Local-only administrator setup

A clean portable checkout provides a **localhost-only simulated sign-in**. It always represents the same test identity, not a real ChatGPT account or several independent users.

1. Before registering a profile, temporarily set `BOOTSTRAP_ADMIN_ENABLED=true` in your ignored `.env`.
2. Start/restart `pnpm dev`, open the localhost URL, sign in, and complete the profile.
3. Confirm **Manage mandis** is available.
4. Set `BOOTSTRAP_ADMIN_ENABLED=false` and restart the server.
5. Add fictional local centres if needed for development.

Never expose this bootstrap procedure through a public tunnel. If the first local profile was registered with bootstrap disabled, enabling it later will not promote that profile. For a disposable local database only, stop the server, remove its `.wrangler/state` directory, then rerun migrations and bootstrap. This deletes all local records; it is not a production recovery procedure.

Managed ChatGPT Work environments use their own authenticated preview and execution profile. Their local mock sign-in is disabled. Use the Sites workflow there; do not change the profile to bypass authentication.

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Run the development server |
| `pnpm test` | Run the backend integration suite using an in-memory database |
| `pnpm typecheck` | Check TypeScript |
| `pnpm build` | Produce the Workers application and client assets |
| `pnpm db:generate` | Generate a new migration after a schema edit |
| `pnpm db:migrate:local` | Apply committed migrations to local D1 only |
| `pnpm start` | Preview an existing build in local Wrangler; not a production deployment |

The production preview does not include the Vite development sign-in middleware. Use `pnpm dev` for local account screens.

Managed Sites environments retain their existing `npm run install:ci` installer and Sites build helper. Ordinary clones and GitHub Actions use the pinned pnpm installation above and `pnpm build`; no external `build-site.mjs` file is required.

## Configuration

| Setting | Default | Meaning |
| --- | --- | --- |
| `BOOTSTRAP_ADMIN_ENABLED` | `false` | Allows the first registration in an empty database to become administrator when exactly `true` |
| D1 binding `DB` | Declared in `.openai/hosting.json` | The database binding required by runtime code |
| Hosting project ID | Existing MandiMitra project | Identifies the owner's Site; not a credential or permission to deploy it |

Local `.env` and `.dev.vars*` files must not be committed. If you use `.dev.vars`, keep its values consistent with your local setup; Wrangler may load it instead of `.env`. Production values belong in Sites settings.

## Migrations and troubleshooting

Never edit an already deployed migration or its metadata. Add a migration with `pnpm db:generate`, review the SQL, and exercise it locally.

- **Storage unavailable / missing table:** run local migrations from the project root, then restart development.
- **No mandis:** create a local administrator and configure an active centre.
- **Cannot book:** the farmer must be verified; the lot, opening days, capacity and future time slot must be valid. The single simulated identity cannot test every role at once; the automated suite uses distinct identities.
- **Install complains about a different lockfile:** use the pinned pnpm version and frozen lockfile; do not replace it with an npm lockfile.
- **Build succeeded but sign-in fails on another host:** production identity is provided by Sites. Read the authentication boundary in [DEPLOYMENT.md](DEPLOYMENT.md).
