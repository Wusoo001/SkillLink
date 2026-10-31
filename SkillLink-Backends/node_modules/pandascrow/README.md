# Pandascrow JavaScript SDK

Official Node.js / JavaScript library for the [Pandascrow v3 API](https://pandascrow.readme.io/): escrow, wallets, payouts, bank transfers, virtual accounts, invoices, payment links, KYC and webhook verification.

- Written in TypeScript, ships its own types
- ESM and CommonJS
- No dependencies: uses the built-in `fetch` (Node.js 18+, Bun, Deno, Cloudflare Workers, Vercel Edge)

> Use this SDK on your server only. Your API key gives full access to your Pandascrow account, so never ship it to a browser or mobile app.

## Install

```bash
npm install pandascrow
```

## Quick start

```ts
import Pandascrow from 'pandascrow';

const ps = new Pandascrow(process.env.PANDASCROW_API_KEY!);                     // sandbox (default)
// const ps = new Pandascrow(process.env.PANDASCROW_API_KEY!, { sandbox: false }); // live

const escrow = await ps.escrow.createOnetime({
  uuid,                              // the Pandascrow user acting
  initiator_id: uuid,
  initiator_role: 'seller',          // 'buyer' | 'seller' | 'broker'
  title: 'Apartment 4B rent',
  description: '12-month rent, 12 Admiralty Way',
  currency: 'NGN',
  amount: 350000,
  buyer_details: { name: 'Tenant', email: 'tenant@example.com' },
  metadata: { property_id: 'PR-204' }, // your own IDs, see below
});

console.log(escrow.payment_url);     // send the buyer here to fund the escrow
```

CommonJS:

```js
const { Pandascrow } = require('pandascrow');
const ps = new Pandascrow(process.env.PANDASCROW_API_KEY);
```

Your API key is the **public key** of your application (Dashboard → Developers). It is sent as the `Token` header. Most calls also take the `uuid` of the Pandascrow user you are acting for.

Every method returns a promise of the `data` object from the API response.

## Errors

Every failure rejects with a `PandascrowError`: network errors, timeouts, invalid responses, HTTP errors and any response with `status: false`.

```ts
import { PandascrowError } from 'pandascrow';

try {
  await ps.escrow.complete(uuid, escrowId, otp);
} catch (err) {
  if (err instanceof PandascrowError) {
    err.message;   // "Invalid OTP"
    err.status;    // 400 (0 for network errors and timeouts)
    err.docUrl;    // link to the API reference, when available
    err.response;  // full decoded response body
  }
}
```

## Metadata

Escrows, invoices and virtual accounts accept a `metadata` object with your own identifiers. Pandascrow stores it as-is, returns it when you fetch the record, and includes it as `data.metadata` in every webhook for that record:

```ts
await ps.escrow.createOnetime({ ..., metadata: { property_id: 'PR-204' } });

// later, in your webhook handler
event.data.metadata?.property_id;   // "PR-204"
```

Limits: up to 50 keys, key names up to 64 characters, 5 levels of nesting, 8 KB in total.

## Resources

| Property | Methods |
|---|---|
| `escrow` | `createOnetime`, `createMilestone`, `createRecurring`, `create`, `all`, `find`, `complete`, `resendReleaseOtp`, `payNextMilestone`, `completeMilestone`, `regeneratePayment`, `regenerateMilestonePayment`, `dispute`, `disputes`, `joinRecurring` |
| `wallet` | `list`, `balances`, `transactions`, `accounts`, `payout` |
| `payouts` | `create`, `all`, `settlementAccounts` |
| `bank` | `banks`, `validate`, `transfer`, `settlementAccount` |
| `virtualAccounts` | `createDynamic`, `createStatic`, `reallocate`, `deactivate`, `reactivate`, `confirmPayment` |
| `invoices` | `create`, `all`, `find`, `pay`, `cancel` |
| `paymentLinks` | `create`, `all`, `find`, `isSlugAvailable`, `goLive`, `toggleTip`, `payments`, `initiatePayment`, `completePayment`, `addMargin` |
| `kyc` | `bvn`, `nin`, `phone`, `nuban`, `driversLicense`, `tin`, `cac`, `searchCac`, `email` |
| `auth` | `login`, `verifyLoginOtp` |

Anything not wrapped yet:

```ts
await ps.request('GET', '/clients', { uuid });
await ps.request('POST', '/escrow/recurring/update', {}, { uuid, escrow_id: 12 });
```

### Examples

```ts
// Milestone escrow, paid stage by stage
await ps.escrow.createMilestone({
  uuid, initiator_id: uuid, initiator_role: 'buyer',
  title: 'Website build', description: 'Company website', currency: 'NGN',
  seller_details: { name: 'Dev Studio', email: 'studio@example.com' },
  deposit_option: 'milestone',
  milestones: [
    { title: 'Design', amount: 150000 },
    { title: 'Build', amount: 350000 },
  ],
});

// NGN transfer to a bank account (keep the idempotency key to retry safely)
await ps.bank.transfer(uuid, 25000,
  { account_number: '0123456789', account_name: 'Ada Obi', bank_code: '058' },
  { idempotencyKey: 'payout-7781' },
);

// Virtual account that accepts any amount, expiring in 24 hours
await ps.virtualAccounts.createDynamic(uuid, 'Ada Obi', null, { expiryHours: 24, metadata: { customer_id: 'C-9' } });

// Invoice
await ps.invoices.create({
  ownerUuid: uuid,
  client: { full_name: 'Client Co', email: 'billing@client.co' },
  invoice: { currency: 'NGN', due_date: '2026-12-31' },
  items: [{ description: 'Consulting', quantity: 10, unit_price: 20000 }],
  metadata: { order_id: 'A-1001' },
});
```

## Webhooks

Pandascrow signs every webhook with HMAC-SHA256 of the **raw request body**, using your application's **secret key**, and sends it in the `X-Pandascrow-Signature` header. `verifyWebhook` checks it and returns the parsed event. Always give it the raw body, not a parsed object.

**Express**

```ts
import express from 'express';
import { verifyWebhook } from 'pandascrow';

app.post('/webhooks/pandascrow', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const event = await verifyWebhook(process.env.PANDASCROW_SECRET_KEY!, req.body, req.get('X-Pandascrow-Signature'));

    switch (event.event) {
      case 'escrow.paid':      /* event.data.metadata?.property_id */ break;
      case 'escrow.completed': break;
      case 'invoice.paid':     break;
    }
    res.sendStatus(200);
  } catch {
    res.sendStatus(400);
  }
});
```

**Next.js (App Router)**

```ts
// app/api/webhooks/pandascrow/route.ts
import { verifyWebhook } from 'pandascrow';

export async function POST(req: Request) {
  const raw = await req.text();
  try {
    const event = await verifyWebhook(process.env.PANDASCROW_SECRET_KEY!, raw, req.headers.get('x-pandascrow-signature'));
    // handle event.event / event.data
    return new Response('ok');
  } catch {
    return new Response('invalid signature', { status: 400 });
  }
}
```

Events older than 5 minutes are rejected; pass `{ tolerance: seconds }` as the fourth argument to change that (`0` turns it off).

Events include `escrow.created`, `escrow.paid`, `escrow.completed`, `escrow.milestone.completed`, `escrow.dispute.opened`, `escrow.payout.completed`, `escrow.payout.processing`, `escrow.payout.failed`, `recurring.payment.success`, `invoice.paid` and `wallet.deposit.success`.

## Options

```ts
new Pandascrow(apiKey, {
  sandbox: true,      // false for live
  baseUrl: undefined, // override the host, e.g. a local API
  timeout: 30000,     // milliseconds
  headers: {},        // extra headers on every request
  fetch: undefined,   // custom fetch (logging, retries, tests)
});
```

## Development

```bash
npm install
npm test          # unit tests with a fake fetch, never calls the API
npm run typecheck
npm run build     # dist/ (ESM + CJS + types)
```

## License

MIT
