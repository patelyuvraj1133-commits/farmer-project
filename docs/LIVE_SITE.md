# Visiting MandiMitra

**Website: https://mandimitra.work.gd**

MandiMitra lets farmers register crop lots and book procurement visits, and lets authorized staff operate queues and record procurement.

## Access and first visit

- The Site is publicly accessible, but account features require **ChatGPT sign-in**.
- Signing in does not make you staff or administrator.
- Farmers complete a profile, choose an available centre and obtain staff verification before booking.
- Centres and staff roles are configured by the administrator. If no active centres appear, the operator has not made one available; the app does not invent official centres.
- The public URL uses a persistent database. Use [local development](DEVELOPMENT.md) for fictional records or role experiments.

## What the numbers mean

Queue status refreshes every 15 seconds, or 60 seconds in low-data mode, and pauses in a hidden browser tab. Waiting times are estimates based on recorded durations when enough samples exist, otherwise the centre's configured duration.

A payment status means staff recorded a reference for an external transfer. **It does not prove your bank received money.** Check the actual bank transaction.

## Domain and hosting status

Hosting settings checked on **September 13, 2026**:

| Item | Observed status |
| --- | --- |
| `mandimitra.work.gd` | Active hostname and active TLS certificate; canonical public link |
| `mandimitraa.com` | Pending hostname/TLS validation; do not share as a working address |
| Site audience | Public; application roles still control account actions |
| Hosting | ChatGPT Sites on Cloudflare Workers with D1 |
| Administrator bootstrap | Disabled and applied to the live deployment after confirming an existing administrator |

This is a dated configuration snapshot, not continuous uptime monitoring. DNS/TLS activation alone does not prove all application workflows work. Do not infer live-site status from a GitHub commit.

## If something does not work

- **Sign-in required:** use the site's ChatGPT sign-in button. There is no separate MandiMitra password or public demo password.
- **Profile awaiting verification:** contact your selected centre's staff; creating an account does not automatically verify you.
- **No slots:** check the selected crop, centre, working day, future time and capacity.
- **Storage error or page unavailable:** try again and report the time, page and error text through [GitHub Issues](https://github.com/patelyuvraj1133-commits/farmer-project/issues). Do not include your phone number, payment reference or sign-in details.
- **The .com address fails:** use the canonical link above until its separate verification is complete.

This is a portfolio/pilot implementation, not a government procurement portal or a bank payment service.
