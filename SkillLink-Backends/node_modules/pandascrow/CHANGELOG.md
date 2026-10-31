# Changelog

## 1.0.0 (2026-10-25)

First release.

- `Pandascrow` client for the v3 API (sandbox by default, live with `{ sandbox: false }`), with `escrow`, `wallet`, `payouts`, `bank`, `virtualAccounts`, `invoices`, `paymentLinks`, `kyc` and `auth` resources, plus `request()` for anything not wrapped.
- `metadata` support for escrows, invoices and virtual accounts.
- `verifyWebhook()` checks the HMAC-SHA256 signature of the raw body, with replay protection. Works on Node.js, Bun, Deno and edge runtimes.
- `PandascrowError` for every failure, with `status`, `docUrl` and `response`.
- Typed parameters and responses, ESM + CommonJS builds, no runtime dependencies.
