# SkillLink / Street — Project Memory

> Single source of truth for what this project is, what's been built, and what's next.
> Update this file whenever a significant feature ships or a critical decision is made.
> Last updated: 2026-11-03

---

## 🎯 What This Project Is

**SkillLink** (branded **"Street"** in the app) is a Nigerian services marketplace mobile app — think Uber/Airbnb but for skilled workers (plumbers, electricians, designers, mechanics, developers, etc.).

**Core loop:**
1. Provider creates a service post (skill, price, location, media)
2. Client browses feed → books a service
3. Provider accepts → client pays into **escrow**
4. Provider completes job → client confirms → funds released to provider's bank

**Unique value:**
- Escrow-protected payments (Pandascrow)
- In-app chat with contact-info filter (blocks WhatsApp/phone sharing)
- Rating + review system
- Bank setup for providers (payouts go direct to their bank)
- In-app wallet replaced with "Earnings" view (Pandascrow pays bank directly)

**Brand note:** App name inside the code is "Street", repo is "SkillLink" — both used interchangeably.

---

## 📁 Repo Layout
SkillLink-App/
├── SkillLink-Backends/ ← Node.js + Express API
│ ├── controllers/ ← Route handlers
│ ├── models/ ← Mongoose schemas
│ ├── routes/ ← Express routers
│ ├── middleware/ ← authMiddleware, adminMiddleware
│ ├── services/ ← paystackService, pandascrowService, walletService, emailService
│ ├── utils/ ← contactFilter, helpers
│ ├── .env ← NEVER COMMIT (gitignored)
│ └── server.js
│
├── SkillLink-Frontend/ ← Expo React Native (mobile + web)
│ ├── src/
│ │ ├── screens/ ← All screens
│ │ ├── components/ ← Reusable UI
│ │ ├── context/ ← ThemeContext
│ │ ├── services/api.js ← All API calls
│ │ ├── data/ ← nigeriaStates (774 LGAs)
│ │ └── utils/
│ ├── context/ ← AuthContext, PostContext (root-level — intentional)
│ ├── App.js ← Navigation + providers
│ └── .env ← EXPO_PUBLIC_API_URL
│
├── admin-dashboard/ ← Separate React + Tailwind admin panel (web only)
│ ├── src/pages/ ← Dashboard, Users, Posts, Bookings, Reports, Appeals, Reviews, Transactions
│ ├── src/components/
│ └── .env ← VITE_API_URL
│
└── MEMORY.md ← This file



**⚠️ Note on folder layout:** `AuthContext` and `PostContext` live at `SkillLink-Frontend/context/` (root), while `ThemeContext` lives at `SkillLink-Frontend/src/context/`. This is intentional — different import paths (`../../context/X` vs `../context/X`) resolve correctly given where screens live.

---

## 🛠️ Tech Stack

| Layer | Tech |
|---|---|
| Backend | Node.js 24 · Express · Mongoose (MongoDB Atlas) |
| Auth | JWT (30-day expiry) · bcryptjs |
| Frontend | React Native (Expo SDK ~52) · React Navigation · React Native Web |
| Admin | React 18 · Vite · Tailwind CSS 3 · Recharts · lucide-react |
| Escrow | **Pandascrow** (broker model, 5% platform commission) |
| Payments | Pandascrow (replaced Paystack) |
| Media | Cloudinary (unsigned upload preset `SkillLink`, cloud `dz2te6uth`) |
| Deployment | Render (backend, free tier) · Expo EAS (frontend, TBD) |

---

## 🔐 Environment Variables (names only — never commit values)

### `SkillLink-Backends/.env`

MONGO_URI ← MongoDB Atlas connection string
JWT_SECRET ← signing key
JWT_EXPIRES_IN ← e.g. "30d"
BASE_URL ← backend public URL (ngrok local / Render prod)
FRONTEND_RETURN_URL ← where HTML redirect sends user after payment
EMAIL_USER ← Gmail address for verification emails
EMAIL_PASS ← Gmail app password
ADMIN_EMAIL ← admin user's email
PANDASCROW_API_KEY ← pk_test_ / pk_live_
PANDASCROW_SECRET_KEY ← sk_test_ / sk_live_ (also used for webhook signature)
PANDASCROW_PLATFORM_UUID ← platform's Pandascrow user UUID
PANDASCROW_RETURN_URL ← Pandascrow redirect target (must be HTTPS)
PLATFORM_COMMISSION_PERCENT ← 5 (means 5%, NOT ₦ amount)
MIN_BOOKING_PRICE ← 5000
PORT ← auto-set by Render (do NOT hardcode)
NODE_ENV ← "production" on Render


### `SkillLink-Frontend/.env`

EXPO_PUBLIC_API_URL ← http://LAN_IP:5000/api (dev) or https://...onrender.com/api (prod)
EXPO_PUBLIC_MIN_BOOKING_PRICE (optional, defaults to 5000)


### `admin-dashboard/.env`
VITE_API_URL ← same as backend API URL



---

## ✅ Completed Features (as of 2026-11-03)

### 🔐 Security & Auth
- ✅ **B3** — `getBookings` filters by `req.user._id` (was returning all bookings — data leak)
- ✅ **B4** — `authMiddleware` returns `code: "TOKEN_EXPIRED"` on expired JWT → frontend auto-logout works
- ✅ **B10** — `getBookings` populate excludes password hash + sensitive fields
- ✅ **B12** — `PUT /users/:id` strips password/verification tokens from response
- ✅ **B13** — `GET /users/me` + `GET /users/:id` strip `verificationToken` + `verificationTokenExpires`
- ✅ **B14** — `GET /users/:id` requires auth (`protect` middleware) + strips `bankDetails`, `deleteRequestedAt`, `scheduledDeletionAt`
- ✅ **B15** — `GET /users/:id` also strips `email` and `phone`
- ✅ **Session UX** — JWT extended from 7 days → **30 days** on both `/login` and `/check-restriction`
- ✅ **contactFilter** — fixed false positives (`"outside"`, `"ig "`) with word boundaries; expanded number-word detection to catch `"one tow three four"`, `"0 two three four"`, and 40+ misspellings; added bulletproof 10+ digit run check with separator stripping

### 💰 Escrow (Pandascrow)
- ✅ Full integration replacing Paystack
- ✅ **Broker model** — `initiator_role: "broker"`, `initiator_id: PLATFORM_UUID`, `broker_id: PLATFORM_UUID`
- ✅ **5% platform commission** via `partner_escrow_fee: PLATFORM_COMMISSION_PERCENT` (env-driven)
- ✅ **`who_pay_fees: "seller"`** — client pays exact price; Pandascrow fee + platform commission both deducted from provider payout
- ✅ **Unique payload per booking** — `title: ${serviceTitle} #${booking._id.slice(-6)}` prevents idempotency collisions
- ✅ **Webhook signature verification** — signs raw body with `PANDASCROW_SECRET_KEY` (HMAC-SHA256)
- ✅ **Webhook fallback by `escrow_id`** — `escrow.paid` event has no `metadata.bookingId`, so lookup by `payment.pandascrowEscrowId` required
- ✅ **OTP release flow** — `complete(uuid, escrowId, otp)` — SDK requires all three
- ✅ **Net amount storage** — `payment.pandascrowNetAmount`, `payment.pandascrowPlatformFee` saved from webhook
- ✅ **Payment return flow** — Pandascrow → `/payment-return` HTML page → `PaymentReturnScreen` in app
- ✅ **`GET /bookings/by-escrow-id/:escrowId`** — new endpoint for payment return polling
- ✅ **`GET /bookings/by-reference/:reference`** — new endpoint replacing the old `verify-payment` (which called Paystack)

### 📢 Notifications
- ✅ Full lifecycle coverage:
  - `booking_request` — client books → provider notified
  - `booking_accepted` — provider accepts → client notified
  - `booking_rejected` — provider declines → client notified
  - `booking_cancelled` — client cancels → provider notified
  - `payment_received` — client pays → provider notified (**shows net amount + "after fees"**)
  - `booking_completed` — provider marks complete → client notified
  - `funds_released` — client confirms → provider notified (**net amount, not gross**)
  - `chat_message` — any message → recipient notified
  - `warning_received` / `account_suspended` / `account_banned` / `appeal_accepted` / `appeal_rejected` — admin actions
- ✅ **Tap routing** — booking notifications navigate to Dashboard (with correct tab), chat notifications to Chat screen

### 🎨 Dashboard
- ✅ **Earnings card** replaces old wallet balance — shows Total Earnings (released bookings) + Pending (in escrow)
- ✅ **Provider per-booking earnings breakdown** — "YOUR EARNINGS" box on each card: Client Pays, Platform Fee, Escrow Fee, **You Receive** (net)
- ✅ **Exact vs estimated** — uses actual `pandascrowNetAmount` from webhook after payment; estimates before
- ✅ **Client message + scheduled date** shown on each booking card
- ✅ **Removed Platform Fee: ₦0** from client-facing UI (BookingSheet + BookingScreen invoice) — cleaner UX

### 🔔 OTP Release Modal
- ✅ Custom `Modal` replaces broken `Alert.prompt` (iOS-only)
- ✅ Works identically on **Android, iOS, and web**
- ✅ Inline error handling — wrong OTP shows red banner, can retry without closing
- ✅ Parent Dashboard holds the modal state; `BookingCard` delegates via `onRequireOtp` prop

### 📱 Frontend Fixes
- ✅ **F1** — `AuthContext.updateUser` added (profile edits propagate)
- ✅ **F2** — `PaymentReturnHandler` axios relative URL fixed
- ✅ **F3** — `api.js` now uses `EXPO_PUBLIC_API_URL` env var (was hardcoded LAN IP)
- ✅ **F5** — `theme.js` status colors completed (11 booking statuses)
- ✅ **F6** — `UserProfileScreen` uses `getUserPosts(userId)` instead of client-side filter
- ✅ **F7** — `BookingSheet` awaits network call before closing (errors shown inline)
- ✅ **F8** — `PaymentDashboard` route removed (fixed hidden tabs bug)
- ✅ **F12** — `PaymentReturnHandler` / `PaymentScreen` navigate to `MainTabs` (was `"Home"` which doesn't exist)
- ✅ **F15** — `Dashboard` `STATUS_LABELS` includes `ready_for_release`
- ✅ **Nigeria LGA migration** — all 774 LGAs (was 6 "cities" per state)

### 🏦 Admin Dashboard (Separate App)
- ✅ Full admin panel at `admin-dashboard/` (React + Vite + Tailwind)
- ✅ Admin auth via email match (`ADMIN_EMAIL` in backend env)
- ✅ Pages: Dashboard (stats + chart), Users, User Detail, Posts, Bookings, Reports, Appeals, Reviews, Transactions
- ✅ **Ban/Suspend/Warn** system — actions trigger notifications + block user via `authMiddleware`
- ✅ **Appeal system** — user submits appeal → admin reviews → accept (unban) or reject
- ✅ Wallet admin actions

### 🏗️ Backend Features
- ✅ **Feed Ranking** — weighted algorithm (reputation 35%, freshness 25%, location 15%, engagement 15%, verification 10%)
- ✅ **`optionalAuth` middleware** — ranked feed works for both logged-in and anonymous users
- ✅ **Ban/Suspend enforcement** — `authMiddleware` blocks banned/suspended users on every request
- ✅ **Min booking price** — `MIN_BOOKING_PRICE=5000` enforced in `createBooking` (client) + `CreatePostScreen` (provider)
- ✅ **Self-booking prevention** — `createBooking` rejects if `client === provider`
- ✅ **`Appeal` model + routes** — `/api/appeals` (public), `/api/admin/appeals` (admin)
- ✅ **Backend deployed to Render** — `https://skilllink-api-7jue.onrender.com`

---

## 🚨 Known Issues / Pending

### 🔴 Critical — Not Yet Done
- **Rotate MongoDB password** — currently very weak (`08100196037` — a phone number pattern). Also username `SkillLink`. Rotate via Atlas → Database Access.
- **Add DB name to Mongo URI** — currently missing after `.net/` → defaults to `test` database. Should be `/skilllink` (or whatever the actual DB name is). Verify in Atlas → Browse Collections first.
- **Atlas IP whitelist** — for Render to connect, need to add `0.0.0.0/0` in Atlas → Network Access. Verify this was done after last deploy.

### 🟡 Code Cleanup (low urgency)
- **F4** — `api.js` has ~15 redundant token fetches (interceptor already attaches it)
- **F9** — `AuthContext` double `JSON.parse` in `loadToken`
- **F10** — `api.js` doesn't handle `TOKEN_INVALID` (zombie state for corrupt tokens)
- **F14** — Cloudinary cloud name + preset hardcoded in `CreatePostScreen` / `EditProfileScreen`
- **F17** — `createBookingRequest` in `BookingScreen` is dead code (post-F7)
- **F20** — `GET /posts/myposts` has no pagination cap (same fix pattern as F19)
- **B11** — Search won't match old posts (need one-time backfill of `locationCity/State`)
- **`BookingScreen.js` OTP** — still has the old broken `Alert.prompt` code. Should apply same fix as Dashboard, OR remove the Confirm Completion button from that screen entirely (actions belong on Dashboard now).
- **`BookingScreen.js` navigation** — is `PaymentDashboard` route gone from `App.js` but `BookingScreen` might still reference it in one path.

### ⚪ Long-Term / Feature Backlog
- **Refresh token flow** — 30-day JWT is a stopgap; real refresh tokens enable "stay logged in for months"
- **Startup pre-flight token check** — eliminates the flash of logged-in state on app open with expired token
- **Native build (EAS)** — prerequisites:
  1. Update `app.json` with `scheme: "streetapp"`, `android.package`, `intentFilters`
  2. Deep link testing on real device
  3. Deploy frontend to a real domain (Vercel/Netlify) so `FRONTEND_RETURN_URL` isn't a LAN IP
- **Production escrow keys** — currently `pk_test_` / `sk_test_`. Needs Pandascrow KYB to go live.
- **Withdrawal flow** — currently provider payouts go direct to bank via Pandascrow. The old wallet withdrawal UI is removed. If you want in-app "earnings history" or separate withdrawals, that's a new feature.
- **Admin — Audit log** — not built. Track admin actions (warn/ban/unban) with timestamps.
- **Session UX** — 30-day JWT is done. Consider adding a "Session expiring soon" prompt at day 29.

---

## 🚀 Deployment

### Backend — Render (live)
- URL: `https://skilllink-api-7jue.onrender.com`
- Root Directory: `SkillLink-Backends`
- Build Command: `npm install`
- Start Command: `node server.js` (NOT `npm start` — `npm start` uses `nodemon` which is a dev dependency and doesn't work on Render)
- Free tier: **sleeps after 15 min idle** → first request after sleep takes 30-60s
- Auto-deploys on `git push origin main`

### Frontend — Not deployed yet
- Dev: `npx expo start --web` (localhost:8081) or Expo Go on phone
- Prod plan: EAS build for mobile APK/IPA + Vercel for web
- `.env` must point at Render backend for prod builds

### Admin Dashboard — Not deployed yet
- Dev: `cd admin-dashboard && npm run dev` (localhost:5173)
- Prod plan: Vercel/Netlify static build

---

## ⚠️ Critical Gotchas / Lessons Learned

### Escrow
1. **`partner_escrow_fee` is a PERCENTAGE, not a Naira amount** — sending `1900` means 1900%, not ₦1,900. Send `5` for 5%.
2. **Pandascrow idempotency** — auto-hashes payload. Two bookings with same client/provider/title/amount → same escrow. **Fix: append `#${_id.slice(-6)}` to title** to force uniqueness.
3. **`escrow.paid` webhook has `metadata: null`** — only `escrow.created` includes metadata. Must fall back to lookup by `pandascrowEscrowId`.
4. **`ps.escrow.complete(uuid, escrowId, otp)`** — SDK requires all 3 args. No two-arg form. OTP is mandatory.
5. **`ps.escrow.find(uuid, escrowId)`** — also requires uuid first.
6. **Broker model required for release authority** — `initiator_role: "broker"` + `initiator_id: PLATFORM_UUID`. Without this, `complete()` fails with "access denied".
7. **Webhook signature** — signs **raw body** with `PANDASCROW_SECRET_KEY`, not reconstructed JSON.
8. **`fetch` URL must be HTTPS** — for `PANDASCROW_RETURN_URL`.

### Network / Dev
1. **LAN IP changes on WiFi reconnect** — check `ipconfig` when things suddenly fail. Update `.env` files.
2. **Windows Firewall blocks port 5000 on LAN IP but not localhost** — `curl localhost:5000` works, `curl 192.168.x.x:5000` times out. Fix: add firewall rule for port 5000, OR use `localhost` in `.env`.
3. **Free ngrok: 1 tunnel per account** — can't run backend + frontend ngroks simultaneously. Backend only for webhooks; frontend uses LAN.
4. **Env changes require backend restart** — `dotenv` loads on startup only.
5. **Render free tier sleeps** — first request wakes it up (~30-60s). Not a bug.

### Frontend
1. **`Alert.prompt` is iOS-only** — silent `undefined` on Android/web. Use custom `Modal` for input.
2. **`initialState` in `NavigationContainer` overrides URL** — deep linking broken if `initialState` is passed. Fix: skip state restore when URL is a deep link.
3. **Expo Web `--clear` flag** — required after `.env` changes, or old values stay cached.
4. **`EXPO_PUBLIC_*` vars** are inlined at build time — **never put secrets there**.
5. **localStorage is per-origin** — logging in on `localhost:8081` doesn't authenticate on `192.168.1.233:8081`. Pick one origin and stick with it.

### Git
1. **GitHub push protection blocks secrets** — `.env` files must be gitignored. If a secret already landed in history, use `git filter-repo` or `git filter-branch` to purge.
2. **If secret exposed** — rotate immediately. Test keys are still valuable (quota, data tampering).

---

## 🧪 Testing Flow (Escrow End-to-End)

### Prerequisites
- Backend running (`npm start` in `SkillLink-Backends`)
- Frontend running (`npx expo start --web --clear`)
- Pandascrow webhook URL points to backend (ngrok or Render)
- Client + Provider accounts both verified
- Provider has `bankDetails` saved (via `BankSetup` screen)

### Steps
1. **Client creates booking** → `POST /bookings` → 201
2. **Provider accepts** → `PUT /bookings/:id/accept` → `status: "accepted"`
3. **Client pays** → `POST /bookings/initialize-payment` → `checkout_url` + `reference`
4. **Client opens checkout_url** → pays on Pandascrow sandbox
5. **Webhook fires** → `escrow.paid` → booking `status: "paid_in_escrow"`
6. **Verify in MongoDB**: `payment.pandascrowNetAmount` populated, `payment.escrowStatus: "funded"`
7. **Provider marks complete** → `PUT /bookings/:id/complete` → `status: "completed"`
8. **Client taps "Confirm Completion"** → backend sends OTP → **OTP modal opens**
9. **Client enters OTP from email** → `PUT /bookings/:id/confirm` with `{ otp }` → `status: "released"`
10. **Verify in MongoDB**: `payment.escrowStatus: "released"`, `payment.releasedAt` set
11. **Check Dashboard**: Provider sees earnings in "Total Earnings"
12. **Check notifications**: Both parties got all 6 lifecycle notifications

### Expected amounts (for ₦38,000 booking, 5% commission, ~3% Pandascrow fee)
- Client pays: ₦38,000
- Platform commission: ₦1,900 (5%) → platform's Pandascrow wallet
- Pandascrow fee: ~₦1,140 (3%)
- Provider receives: **₦34,960**

---

## 🎯 Next Session — Where to Start

### Priority 1 — Fix today's remaining blockers
- [ ] **Push today's code** (`git add -A && git commit && git push origin main`)
- [ ] **Verify idempotency fix works** — create two identical bookings, confirm both escrows created
- [ ] **Verify `contactFilter` fix works** — send `"08012345678"`, `"one tow three four"` in chat, confirm both blocked with debug logs showing in backend terminal
- [ ] **Rotate MongoDB password** (currently weak)
- [ ] **Add DB name to Mongo URI** (currently defaults to `test`)

### Priority 2 — Native build prep
- [ ] Update `app.json` — `scheme: "streetapp"`, `android.package: "com.yourcompany.street"`, `intentFilters`
- [ ] Update `PANDASCROW_RETURN_URL` to `streetapp://payment-return` for mobile
- [ ] Update `FRONTEND_RETURN_URL` to `streetapp://payment-return`
- [ ] Deploy frontend to Vercel or set up EAS build
- [ ] Test full escrow flow on real Android device via Expo Go or APK

### Priority 3 — Code cleanup
- [ ] Fix `BookingScreen.js` OTP flow (or remove Confirm Completion button from that screen)
- [ ] F4, F9, F10, F14, F17, F20 — small refactors
- [ ] B11 — backfill `locationCity/State` on old posts

### Priority 4 — Production readiness
- [ ] Pandascrow KYB → switch to `pk_live_` / `sk_live_`
- [ ] Custom domain + SSL for backend (`api.streetapp.ng`)
- [ ] Frontend deployment with real domain
- [ ] Admin dashboard deployment
- [ ] Add rate limiting to public endpoints
- [ ] Add audit log for admin actions

---

## 🔗 Third-Party Dashboards

| Service | URL | Purpose |
|---|---|---|
| MongoDB Atlas | https://cloud.mongodb.com | DB management, IP whitelist |
| Pandascrow Dashboard | https://sandbox.pandascrow.io | Escrow management, API keys |
| Render | https://dashboard.render.com | Backend hosting |
| Cloudinary | https://cloudinary.com/console | Media hosting |
| Gmail (app password) | https://myaccount.google.com/apppasswords | Email verification |

---

## 📝 Notes for Future Sessions

- **Golden rule:** When fixing bugs, don't touch unrelated UI, logic, or styles. Surgical fixes only.
- **Ask before big refactors.** Small fixes can proceed, but structural changes need confirmation.
- **Test after each fix.** Don't batch. Paste backend terminal logs when debugging.
- **Never paste `.env` values in chat** — use `<password>` placeholders.
- **If something stops working suddenly:** check LAN IP (`ipconfig`), check backend is running, check `.env` URLs match current origin, check whether Render frontend is stale (needs redeploy).

---

*End of memory file.*


