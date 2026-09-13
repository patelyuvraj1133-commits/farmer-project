# Data handling and operator responsibilities

This document describes the current code. It is not a claim that a production privacy/compliance program has been completed.

## Data stored by the application

- ChatGPT account identifier and email, plus the name, Indian mobile number and village entered in the profile.
- Selected centre, role and verification status.
- Registered crop details, booking dates, tokens and queue status.
- Procurement weights, agreed rates, totals, externally supplied payment references and event history.
- In-app notifications and read timestamps.

Records are stored in the Site's Cloudflare D1 database. They are not included in this GitHub repository.

Farmers can access their own workspace and bookings. Centre staff can access authorized centre operations and farmer verification data; the administrator manages centres and staff. Public market/queue responses include centre data, aggregate loads and called tokens, not farmer phone numbers or payment references.

Browser geolocation is optional for distance comparison. The current distance calculation uses the browser position locally; centre coordinates are stored as centre configuration.

## Before collecting real farmer data

The operator must provide a suitable privacy notice, a contact and procedure for access/correction/deletion requests, an appropriate retention period, and a backup/restore and incident-response process.

The application does not currently provide account deletion or a retention scheduler. Do not promise automatic deletion or a fixed retention period. Profile edits and verification are not substitutes for a deletion process.

Do not put live database dumps, identity headers, cookies, phone numbers or payment references in screenshots, tests, commits or public support issues. Use isolated fictional data for development.

## Reports

For ordinary bugs, use GitHub Issues with private information removed. For a vulnerability or unintended exposure of personal data, follow [SECURITY.md](../SECURITY.md).
