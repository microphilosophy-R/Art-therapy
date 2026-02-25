# Construction Stage 2

## Completed in Stage 1 (Carried Forward)

| Item | Status | Notes |
|------|--------|-------|
| Chinese Language (i18n) | ✅ Done | i18next + react-i18next; en.json + zh.json; LanguageSwitcher in Navbar; date-fns zh-CN locale |

---

## Stage 2 — Gap Closures from Stage 1

These items were identified as incomplete in Stage 1 and are the primary targets for Stage 2.

### Frontend Gaps

| Item | Priority | What It Requires |
|------|----------|-----------------|
| FullCalendar Integration | High | Replace the custom slot grid in `BookAppointment.tsx` with FullCalendar v6; add a calendar view tab to `TherapistDashboard.tsx` showing upcoming sessions by day/week |
| Session Notes UI | High | Add a "Write Note" form to the therapist dashboard for completed appointments; wire to existing `POST /appointments/:id/notes`, `GET`, and `PUT` routes; display note history per session |
| Availability Editor UI | High | Add a weekly schedule editor to `TherapistDashboard.tsx` (day toggles + time-range pickers); wire to existing `PUT /therapists/:id/availability` backend route |
| Avatar & Artwork Upload | Medium | Expose Multer + Cloudinary `upload.service.ts` via a `/profile/avatar` endpoint; add a file picker and preview to the Personal Info tab in `UserProfile.tsx` |
| i18n Coverage Parity | Medium | `zh.json` (501 lines) is ~90 lines shorter than `en.json` (590 lines); audit missing keys and complete Chinese translations for all new Stage 2 UI strings |

### Backend Gaps

| Item | Priority | What It Requires |
|------|----------|-----------------|
| Session Notes Endpoint Verification | High | Confirm `POST/GET/PUT /appointments/:id/notes` are fully implemented and tested in `notes.controller.ts`; add route-level Zod validation |
| Avatar Upload Endpoint | Medium | Add `POST /profile/avatar` route that calls `upload.service.ts` and persists the Cloudinary URL to the `User.avatarUrl` field via Prisma |

### DevOps & Quality Gaps

| Item | Priority | What It Requires |
|------|----------|-----------------|
| ESLint + Prettier | Medium | Add `.eslintrc.json` and `.prettierrc` to both `client/` and `server/`; configure TypeScript-aware rules; add `lint` scripts to both `package.json` files |
| Vitest (Frontend Tests) | Medium | Add `vitest.config.ts`; write unit tests for utility functions (`formatters.ts`, `cn.ts`) and component smoke tests for `Button`, `Card`, `StarRating` |
| Jest + Supertest (Backend Tests) | Medium | Add `jest.config.ts`; write integration tests for auth routes (`/auth/register`, `/auth/login`, `/auth/refresh`) and appointment CRUD |
| GitHub Actions CI | Low | Create `.github/workflows/ci.yml`; jobs: lint → type-check (`tsc --noEmit`) → test → build for both client and server |

---

## Stage 2 — New Features

### 1. Real-Time Notifications (WebSocket)

| Sub-feature | Notes |
|-------------|-------|
| Socket.io server integration | Add `socket.io` to the Express server; emit events on appointment status changes, new form assignments, and payment confirmations |
| Client-side notification bell | Add a notification icon to `Navbar.tsx` with an unread badge; dropdown lists recent events |
| In-app toast on booking events | Replace the current polling in `BookingConfirmation.tsx` with a Socket.io event listener |
| i18n | Add `notifications` namespace to both `en.json` and `zh.json` |

### 2. Therapist Dashboard — Enhanced Analytics

| Sub-feature | Notes |
|-------------|-------|
| Revenue chart | Monthly earnings bar chart using Recharts; pulls from existing `/payments/admin/stats` or a new `/payments/therapist/stats` endpoint |
| Client retention metrics | Count of repeat clients per therapist; displayed as a stat card |
| Session completion rate | Completed / total booked ratio; displayed as a progress ring |
| i18n | Translate all new chart labels and stat cards |

### 3. Progress Tracking for Clients

| Sub-feature | Notes |
|-------------|-------|
| Mood / wellbeing check-in | Short 1–5 scale check-in widget on `ClientDashboard.tsx` after each completed session |
| Progress timeline | Visual timeline of sessions + mood ratings on the client profile page |
| Backend model | Add `MoodEntry` Prisma model (`userId`, `appointmentId`, `score`, `note`, `createdAt`) |
| New endpoints | `POST /progress/checkin`, `GET /progress` |
| i18n | Add `progress` namespace to both locale files |

### 4. Therapist Specializations & Search Improvements

| Sub-feature | Notes |
|-------------|-------|
| Specialization tags | Extend `TherapistProfile` with a `tags` string array (e.g., `["trauma", "anxiety", "grief"]`) |
| Filter by tag | Add tag-based filtering to `TherapistDirectory.tsx` and the `/therapists` GET endpoint |
| Sort options | Add sort-by (rating, price, availability) to the therapist listing |
| i18n | Translate all new filter labels and specialization tag names |

### 5. Email Notification Enhancements

| Sub-feature | Notes |
|-------------|-------|
| HTML email templates | Upgrade plain-text `email.service.ts` templates to HTML with the app's colour scheme |
| New triggers | Send email on: form assignment, session note published to client, refund processed |
| Unsubscribe link | Add one-click unsubscribe stored in the `User` model (`emailNotifications: Boolean`) |
| i18n | Bilingual email templates (render in user's preferred language based on `User.locale`) |

### 6. Artwork / Media Uploads in Sessions

| Sub-feature | Notes |
|-------------|-------|
| Artwork upload per session | Allow clients to attach image files to a completed session (up to 5 images); stored in Cloudinary |
| `SessionMedia` Prisma model | `id`, `appointmentId`, `uploaderId`, `url`, `mimeType`, `createdAt` |
| New endpoints | `POST /appointments/:id/media`, `GET /appointments/:id/media`, `DELETE /appointments/:id/media/:mediaId` |
| Therapist view | Gallery component in the therapist's session notes view showing attached artwork |
| i18n | Add upload and gallery strings to both locale files |

---

## Stage 2 — Database Schema Changes

| Model | Change | Reason |
|-------|--------|--------|
| `User` | Add `avatarUrl: String?`, `locale: String @default("en")`, `emailNotifications: Boolean @default(true)` | Avatar upload, bilingual emails, email prefs |
| `TherapistProfile` | Add `tags: String[]` | Specialization filtering |
| `MoodEntry` | New model | Client progress tracking |
| `SessionMedia` | New model | Artwork upload per session |
| `Notification` | New model (`userId`, `type`, `payload: Json`, `read: Boolean`, `createdAt`) | Notification bell persistence |

---

## Stage 2 — i18n Additions

All new UI introduced in Stage 2 must ship with both `en` and `zh` translation keys before the feature is considered complete. New namespaces:

| Namespace / Key Group | Feature |
|-----------------------|---------|
| `notifications.*` | Real-time notification bell |
| `progress.*` | Client mood check-in & timeline |
| `analytics.*` | Therapist revenue & retention charts |
| `media.*` | Artwork upload & gallery |
| `availability.*` | Availability editor (gap closure) |
| `sessionNotes.*` | Session notes UI (gap closure) |

---

## Stage 2 — Summary Checklist

### Gap Closures
- [ ] FullCalendar in BookAppointment + TherapistDashboard calendar view
- [ ] Session Notes UI (write / edit / view)
- [ ] Availability editor UI
- [ ] Avatar upload endpoint + UI
- [ ] i18n parity (zh.json ↔ en.json)
- [ ] ESLint + Prettier configuration
- [ ] Vitest frontend tests
- [ ] Jest + Supertest backend tests
- [ ] GitHub Actions CI workflow

### New Features
- [ ] Real-time notifications (Socket.io)
- [ ] Therapist analytics dashboard
- [ ] Client progress / mood tracking
- [ ] Therapist specialization tags + improved search
- [ ] HTML bilingual email templates
- [ ] Artwork / media uploads per session

---

## Deployment & Demo Mode

### Cloudflare Pages (Frontend)

Cloudflare Pages is connected to the GitHub repository and auto-deploys on every push to `main`.

**Build settings (set once in the Cloudflare Pages dashboard):**

| Setting | Value |
|---------|-------|
| Root directory | `client` |
| Build command | `npm install && npm run build` |
| Build output directory | `dist` |

**Environment variables (set in Cloudflare Pages → Settings → Environment variables):**

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | URL of the deployed backend (e.g. `https://art-therapy-api.up.railway.app/api/v1`) |
| `VITE_PAYMENTS_ENABLED` | `false` (while payments are disabled for demo) |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Can be omitted while `VITE_PAYMENTS_ENABLED=false` |

**SPA routing:** `client/public/_redirects` contains `/* /index.html 200`, which Cloudflare Pages reads automatically to serve the React app for all routes.

---

### Backend Deployment (Recommended: Railway or Render)

The Express/PostgreSQL/Redis backend must be hosted separately. Free-tier options:
- **Railway** — supports Node.js + PostgreSQL + Redis in one project
- **Render** — supports Node.js web services + PostgreSQL add-on

**Environment variables to set on the backend host:**

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_ACCESS_SECRET` | Strong random secret |
| `JWT_REFRESH_SECRET` | Strong random secret |
| `SMTP_*` | Email credentials |
| `CLIENT_URL` | Cloudflare Pages URL (for CORS) |
| `PAYMENTS_ENABLED` | `false` (while payments are disabled for demo) |
| `STRIPE_SECRET_KEY` | Can be omitted while `PAYMENTS_ENABLED=false` |
| `NODE_ENV` | `production` |

---

### Payment Disable/Enable Toggle

Payments are controlled by a pair of environment variables — no code changes required to switch.

| Mode | Frontend var | Backend var | Effect |
|------|-------------|-------------|--------|
| **Disabled (demo)** | `VITE_PAYMENTS_ENABLED=false` | `PAYMENTS_ENABLED=false` | Booking skips Step 4; appointment auto-confirms; no Stripe key required |
| **Enabled (production)** | `VITE_PAYMENTS_ENABLED=true` | `PAYMENTS_ENABLED=true` | Full Stripe payment flow; therapist Stripe Connect required |

**Files changed to implement this toggle:**

| File | Change |
|------|--------|
| `client/src/pages/BookAppointment.tsx` | Reads `VITE_PAYMENTS_ENABLED`; skips `createPaymentIntent`, hides step 4, changes button label to "Confirm Booking" |
| `client/src/pages/booking/BookingConfirmation.tsx` | Accepts `?paymentDisabled=true` query param; skips the `redirect_status=succeeded` requirement |
| `server/src/controllers/appointment.controller.ts` | Skips Stripe account check; creates appointment with `status: CONFIRMED` when disabled |
| `server/src/lib/stripe.ts` | Only throws missing-key error when `PAYMENTS_ENABLED=true` |
| `client/public/_redirects` | New — Cloudflare Pages SPA routing fallback |
