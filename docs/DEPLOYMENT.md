# Deployment and operations

## Supported production host

MandiMitra runs on **ChatGPT Sites with Cloudflare Workers and D1**. GitHub is the source-code repository; it is not the running web server. The application cannot be deployed as a static GitHub Pages site.

The repository's `.openai/hosting.json` refers to the existing owner's project. Contributors must provision their own Site and use its returned project ID; copying this identifier does not grant access. Keep only logical bindings and project identity in the manifest, never secrets or real database credentials.

## Update the existing Site

1. Run `pnpm test`, `pnpm typecheck`, and `pnpm build` for the exact source to publish. In ChatGPT Work, use the Sites build workflow appropriate to its execution environment.
2. Verify the selected Site is MandiMitra and preserve its current access policy.
3. Verify the runtime D1 binding is `DB`. Review any new Drizzle migrations. Back up live data and check the restore procedure before schema changes.
4. In Sites environment settings, confirm `BOOTSTRAP_ADMIN_ENABLED=false` for an initialized application.
5. Publish the exact source through the Sites publishing workflow. The workflow saves its source revision and build archive and deploys that saved version; a GitHub push alone does not do this.
6. Wait for a successful deployment. Environment-setting edits require deployment of a saved version before the new revision is active.
7. Perform the checks below and record the deployed source revision and date in release notes.

The portable build is `pnpm build`. In the managed Work environment the Sites plugin supplies its own build/publish helpers; those are platform tools, not missing files that a GitHub contributor must download.

Expected server output includes `dist/server/index.js`, emitted client assets, `dist/.openai/hosting.json` and `dist/.openai/drizzle/`. Do not manually upload a local `.env` or `.dev.vars` as production credentials.

## Initialize a new, empty Site

1. Keep the new Site owner-private.
2. Apply the schema through the Sites deployment workflow.
3. Temporarily enable `BOOTSTRAP_ADMIN_ENABLED=true` in runtime settings and deploy that setting.
4. As the owner, sign in with ChatGPT and register the first profile. Confirm that it is the administrator.
5. Set bootstrap to `false` and deploy again. Confirm the deployment uses the new environment revision.
6. Configure authorized centres and staff before intentionally widening access.

Bootstrap checks whether **any users exist**, not whether an administrator exists. Enabling it later cannot recover a missing administrator. If setup was performed in the wrong order, the owner must use a controlled database recovery process; do not reset a live database or temporarily expose bootstrap to the public.

## Authentication boundary — required for any host

`app/chatgpt-auth.ts` reads `oai-authenticated-user-*` headers. Production authentication relies on the Sites gateway authenticating visitors and supplying trustworthy identity headers.

These headers are **not credentials and must not be trusted from the public Internet**. If adapting to another host:

- Strip every incoming `oai-authenticated-user-*` header before application routing.
- Verify identity using a real authentication provider and inject identity only from that trusted server-side boundary, or replace `getChatGPTUser` with a verified session implementation.
- Prevent direct access to the backend that bypasses that boundary.
- Implement sign-in, sign-out and callback routes on the new host.
- Configure a real D1 database, migrations, runtime settings, backups, HTTPS and access policy.
- Test forged-header rejection and role/ownership restrictions through the deployed HTTP boundary.

The loopback-only mock in `build/sites-vite-plugin.ts` is development middleware. It is not production authentication. This repository does not provide a ready-to-deploy authenticated configuration for Vercel, Railway, an independent Worker, or a generic Node server.

## Domain and post-deployment checks

Use the current domain listed in [LIVE_SITE.md](LIVE_SITE.md). Attach domains through Sites settings and copy the DNS records returned for that exact domain into the DNS provider. Wait for **both hostname and TLS status to become active** before advertising a new address. A pending domain is not an alternative live URL.

After publishing:

- Open the public URL in a signed-out browser and on a phone.
- Request `/api/health`; expect HTTP 200 and JSON containing `"ok": true` and `"storage": "connected"`. This tests a database connection, not every table or workflow.
- Confirm sign-in and sign-out return to this site.
- Verify an ordinary farmer cannot access staff actions.
- Confirm the owner still has administrator access and bootstrap is disabled.
- In an isolated test environment, complete registration, verification, booking, check-in, weighing and an external payment record. Do not create fake transactions in production.
- Check logs for failures without copying farmer records, tokens or credentials into public issues.

## Recovery and operational work

Keep the previously successful saved version available for a code rollback. A code rollback does not reverse a database migration; review schema compatibility first.

Before operating a real procurement centre, establish an owner for monitoring, backups and restore drills, incident response, data retention and staff offboarding. The repository includes no automated bank settlement, government integration, uptime guarantee or operational approval.
