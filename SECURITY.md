# Security policy

## Report a vulnerability privately

Use GitHub's **Report a vulnerability** option if enabled on this repository. Otherwise contact the repository owner at **patelyuvraj1133@gmail.com** with the subject **MandiMitra security report**.

Describe the affected page, expected behavior and minimal reproduction steps. Do not include other people's records, working credentials, access tokens or full database exports. Do not publish an exploitable issue before the owner can investigate. No response-time guarantee is currently offered.

## Production trust and administration

Production identity comes from the Sites authentication gateway. Raw `oai-authenticated-user-*` HTTP headers are not proof of identity outside that gateway. Another deployment must provide verified authentication, strip client-supplied identity headers and prevent direct backend bypass. See [the deployment boundary](docs/DEPLOYMENT.md#authentication-boundary--required-for-any-host).

`BOOTSTRAP_ADMIN_ENABLED` must remain `false` on an initialized or public deployment. Enable it only for the owner's first registration in an empty, owner-private Site, then disable and redeploy before widening access.

## Secrets and dependencies

- Never commit `.env*` (except the example), `.dev.vars*`, private keys, local databases, cookies, access tokens or database dumps.
- The Sites project ID and D1 binding name are identifiers, not credentials.
- Use production environment settings for runtime secrets.
- CI runs Gitleaks on pushes and pull requests. A passing scanner cannot prove there are no secrets.
- If a credential is exposed, revoke/rotate it first. Removing it from the latest file does not remove earlier commits or copies.
- Use the pnpm lockfile and review dependency changes. Run `pnpm audit` when evaluating dependency risk; no audit result or absence of vulnerabilities is claimed here.
- GitHub workflow permissions are read-only and third-party actions are pinned to commit SHAs.

## Verification limits

Backend tests validate service authorization and SQL rules with simulated identities. They do not validate the deployed identity gateway, DNS/TLS, browser behavior or production capacity. Perform an authorized isolated integration test before operational rollout.
