# Art Therapy Appointment Web Application

A full-stack web application for managing art therapy appointments, clients, and therapists.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Architecture Overview](#architecture-overview)
4. [Project Structure](#project-structure)
5. [Database Design](#database-design)
6. [API Design](#api-design)
7. [Frontend Workflow](#frontend-workflow)
8. [Backend Workflow](#backend-workflow)
9. [Payment Architecture](#payment-architecture)
10. [Authentication & Authorization](#authentication--authorization)
11. [Development Workflow](#development-workflow)
12. [Environment Setup](#environment-setup)

---

## Project Overview

This platform allows:
- **Clients** to browse therapists, book appointments, and track session history
- **Therapists** to manage their schedule, view upcoming sessions, and maintain client notes
- **Admins** to oversee the platform, manage users, and view analytics

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **React 18** | UI component framework |
| **TypeScript** | Type safety across the frontend |
| **Vite** | Fast development server and bundler |
| **React Router v6** | Client-side routing |
| **TanStack Query (React Query)** | Server state management, caching, background refetching |
| **Zustand** | Lightweight global UI state (auth, modal state) |
| **Tailwind CSS** | Utility-first styling |
| **shadcn/ui** | Accessible, composable UI components built on Radix UI |
| **React Hook Form + Zod** | Form management and schema validation |
| **FullCalendar** | Interactive appointment scheduling calendar |
| **Axios** | HTTP client with interceptors for auth tokens |
| **@stripe/stripe-js** | Loads Stripe.js asynchronously, provides `loadStripe()` |
| **@stripe/react-stripe-js** | `<Elements>`, `<PaymentElement>`, `useStripe` / `useElements` hooks |

### Backend
| Technology | Purpose |
|---|---|
| **Node.js 20** | Runtime environment |
| **Express.js** | HTTP server and REST API framework |
| **TypeScript** | Type safety across the backend |
| **Prisma ORM** | Database schema, migrations, and type-safe queries |
| **PostgreSQL** | Primary relational database |
| **Redis** | Session caching and rate limiting |
| **JWT (jsonwebtoken)** | Stateless authentication tokens |
| **bcrypt** | Password hashing |
| **Nodemailer** | Email notifications (appointment confirmations, reminders) |
| **node-cron** | Scheduled jobs (e.g., sending 24h reminders) |
| **Zod** | Request body validation on API routes |
| **Multer + Cloudinary** | File uploads (therapist profile photos, session artwork) |
| **stripe** | Official Stripe Node.js SDK — PaymentIntents, Connect, Transfers, Refunds |

### Database
| Technology | Purpose |
|---|---|
| **PostgreSQL 16** | Relational data: users, appointments, notes |
| **Redis 7** | Token blacklist, rate limiting, ephemeral cache |

### DevOps & Tooling
| Technology | Purpose |
|---|---|
| **Docker + Docker Compose** | Local development environment containerization |
| **ESLint + Prettier** | Code linting and formatting |
| **Vitest** | Frontend unit and component testing |
| **Jest + Supertest** | Backend API integration testing |
| **GitHub Actions** | CI pipeline (lint, test, build) |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                        Browser                          │
│         React + TypeScript + @stripe/react-stripe-js    │
│              (Vite Dev Server / Static Build)           │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS / REST API calls            │ Stripe.js (loaded from CDN)
                       │ (Axios + JWT Bearer Token)        ↕
┌──────────────────────▼──────────────────────────────────┐
│                   Express.js API Server                 │
│                  (Node.js + TypeScript)                 │
│                                                         │
│  ┌──────────┐  ┌─────────────┐  ┌──────────────────┐   │
│  │   Auth   │  │Appointments │  │ Payment Router + │   │
│  │  Router  │  │   Router    │  │ Webhook Handler  │   │
│  └──────────┘  └─────────────┘  └──────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │             Middleware Layer                     │   │
│  │  JWT Verify │ Role Guard │ Validator │ Rate Limit│   │
│  └──────────────────────────────────────────────────┘   │
└──────────────┬───────────────────┬─────────┬────────────┘
               │ Prisma ORM        │ ioredis │ stripe SDK
┌──────────────▼──────────┐  ┌────▼──────────────────┐
│      PostgreSQL 16       │  │      Redis 7           │
│  Users, Appointments,    │  │  Token blacklist,      │
│  TherapistProfiles,      │  │  Rate limit counters,  │
│  Payment, RefundPolicy,  │  │  Short-lived cache     │
│  WebhookEvent, Reviews   │  └────────────────────────┘
└─────────────────────────┘
┌──────────────────────────────────────────────────────┐
│                  Stripe Platform                     │
│  PaymentIntents │ Connect Express Accounts           │
│  Transfers │ Refunds │ Webhooks → POST /webhooks/stripe│
└──────────────────────────────────────────────────────┘
```

### Request Flow (Example: Book an Appointment)

```
Client Browser
  │
  ├─ 1. User fills booking form (React Hook Form + Zod client validation)
  │
  ├─ 2. TanStack Query mutation fires POST /api/appointments
  │      with JWT Bearer token in Authorization header
  │
  ├─ 3. Express middleware chain:
  │      a. Rate limiter checks Redis (max 10 requests/min per IP)
  │      b. JWT middleware verifies token, attaches req.user
  │      c. Role guard ensures user is a CLIENT
  │      d. Zod schema validates request body
  │
  ├─ 4. Appointment controller:
  │      a. Verifies therapist Stripe account is ACTIVE (can receive payments)
  │      b. Checks therapist availability (Prisma query)
  │      c. Creates Appointment record (status: PENDING)
  │      d. Returns appointmentId to frontend
  │
  ├─ 5. Frontend calls POST /payments/create-intent
  │      a. Backend computes amount in cents, platform fee (15%)
  │      b. stripe.paymentIntents.create({ transfer_data.destination })
  │      c. Returns { clientSecret } to frontend
  │
  ├─ 6. Frontend renders <PaymentElement> → client submits card
  │      stripe.confirmPayment() → Stripe processes charge
  │
  └─ 7. Stripe fires webhook: payment_intent.succeeded
         → Backend marks Payment SUCCEEDED, Appointment CONFIRMED
         → Sends confirmation email to client and therapist
         → Frontend polls GET /appointments/:id until CONFIRMED
```

> **Note:** Appointment status does NOT transition to CONFIRMED during the `POST /appointments` request. It stays PENDING until the `payment_intent.succeeded` webhook is received. The webhook is the authoritative source of truth for appointment confirmation.

---

## Project Structure

```
art-therapy-app/
├── client/                          # React frontend
│   ├── public/
│   ├── src/
│   │   ├── api/                     # Axios instance + API call functions
│   │   │   └── payments.ts          # createPaymentIntent, connect, stats calls
│   │   ├── components/
│   │   │   ├── ui/                  # shadcn/ui base components
│   │   │   ├── layout/              # Navbar, Sidebar, Footer
│   │   │   ├── appointments/        # Calendar, BookingModal, AppointmentCard
│   │   │   ├── therapists/          # TherapistCard, TherapistProfile
│   │   │   ├── payments/
│   │   │   │   ├── PaymentForm.tsx           # <PaymentElement> + submit button
│   │   │   │   └── PaymentElementWrapper.tsx # <Elements> provider
│   │   │   └── auth/                # LoginForm, RegisterForm
│   │   ├── hooks/                   # Custom React hooks
│   │   ├── lib/
│   │   │   └── stripe.ts            # loadStripe() singleton
│   │   ├── pages/                   # Route-level page components
│   │   │   ├── Home.tsx
│   │   │   ├── TherapistDirectory.tsx
│   │   │   ├── TherapistProfile.tsx
│   │   │   ├── BookAppointment.tsx
│   │   │   ├── booking/
│   │   │   │   └── BookingConfirmation.tsx   # Post-payment confirmation page
│   │   │   ├── Dashboard/
│   │   │   │   ├── ClientDashboard.tsx
│   │   │   │   ├── TherapistDashboard.tsx    # + Stripe Connect section
│   │   │   │   └── AdminDashboard.tsx        # + Revenue analytics tab
│   │   │   └── auth/
│   │   │       ├── Login.tsx
│   │   │       └── Register.tsx
│   │   ├── store/                   # Zustand stores (auth, UI)
│   │   ├── types/                   # Shared TypeScript interfaces
│   │   │   └── payment.types.ts     # Payment, PaymentStatus, AdminPaymentStats
│   │   ├── utils/                   # Date formatters, validators
│   │   ├── App.tsx                  # Router setup
│   │   └── main.tsx                 # Entry point
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── tsconfig.json
│
├── server/                          # Express backend
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── appointment.routes.ts
│   │   │   ├── therapist.routes.ts
│   │   │   ├── user.routes.ts
│   │   │   ├── admin.routes.ts
│   │   │   └── payment.routes.ts    # NEW
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts
│   │   │   ├── appointment.controller.ts
│   │   │   ├── therapist.controller.ts
│   │   │   ├── user.controller.ts
│   │   │   └── payment.controller.ts # NEW
│   │   ├── middleware/
│   │   │   ├── authenticate.ts      # JWT verification
│   │   │   ├── authorize.ts         # Role-based guard
│   │   │   ├── validate.ts          # Zod request body validator
│   │   │   └── rateLimiter.ts       # Redis-backed rate limiter
│   │   ├── services/
│   │   │   ├── email.service.ts     # Nodemailer templates
│   │   │   ├── upload.service.ts    # Cloudinary integration
│   │   │   ├── scheduler.service.ts # node-cron reminder + stale cleanup jobs
│   │   │   ├── stripe.service.ts    # NEW — all Stripe SDK calls
│   │   │   └── refund.service.ts    # NEW — refund eligibility + processing
│   │   ├── webhooks/
│   │   │   └── stripe.webhook.ts    # NEW — raw-body route + event handlers
│   │   ├── schemas/                 # Zod validation schemas
│   │   │   └── payment.schemas.ts   # NEW
│   │   ├── lib/
│   │   │   ├── prisma.ts            # Prisma client singleton
│   │   │   ├── redis.ts             # Redis client singleton
│   │   │   └── stripe.ts            # NEW — Stripe client singleton
│   │   ├── types/                   # Express Request extensions
│   │   └── app.ts                   # Express app setup
│   ├── prisma/
│   │   ├── schema.prisma            # Database schema
│   │   └── migrations/              # Auto-generated migration files
│   ├── server.ts                    # Entry point
│   └── tsconfig.json
│
├── docker-compose.yml               # PostgreSQL + Redis containers
├── .env.example                     # Environment variable template
└── README.md
```

---

## Database Design

### Entity-Relationship Summary

```
User (1) ────── (1) TherapistProfile
User (1) ────── (N) Appointment  [as client]
TherapistProfile (1) ── (N) Appointment
Appointment (1) ─── (0..1) SessionNote
Appointment (1) ─── (0..1) Payment         ← new
TherapistProfile (1) ── (N) Availability
TherapistProfile (1) ── (0..1) RefundPolicy ← new
User (1) ────── (N) Review  [client writes review]
TherapistProfile (1) ── (N) Review
```

### Prisma Schema (key models)

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String
  role          Role      @default(CLIENT)  // CLIENT | THERAPIST | ADMIN
  firstName     String
  lastName      String
  phone         String?
  avatarUrl     String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  therapistProfile  TherapistProfile?
  appointmentsAsClient  Appointment[]  @relation("ClientAppointments")
  reviews         Review[]
}

model TherapistProfile {
  id            String    @id @default(cuid())
  userId        String    @unique
  user          User      @relation(fields: [userId], references: [id])
  bio           String
  specialties   String[]  // e.g. ["Trauma", "Anxiety", "Children"]
  sessionPrice  Decimal
  sessionLength Int       // minutes (e.g. 50)
  locationCity  String
  isAccepting   Boolean   @default(true)
  rating        Float?    // computed from Reviews

  // Stripe Connect — therapist must be ACTIVE to be bookable
  stripeAccountId     String?
  stripeAccountStatus StripeAccountStatus @default(NOT_CONNECTED)

  appointments  Appointment[]
  availability  Availability[]
  reviews       Review[]
  refundPolicy  RefundPolicy?
}

enum StripeAccountStatus {
  NOT_CONNECTED
  ONBOARDING_IN_PROGRESS
  ACTIVE
  RESTRICTED
  DISABLED
}

model Appointment {
  id              String            @id @default(cuid())
  clientId        String
  client          User              @relation("ClientAppointments", fields: [clientId], references: [id])
  therapistId     String
  therapist       TherapistProfile  @relation(fields: [therapistId], references: [id])
  startTime       DateTime
  endTime         DateTime
  status          AppointmentStatus @default(PENDING)  // PENDING | CONFIRMED | CANCELLED | COMPLETED
  medium          SessionMedium     @default(IN_PERSON) // IN_PERSON | VIDEO
  clientNotes     String?           // notes submitted by client at booking
  createdAt       DateTime          @default(now())

  sessionNote     SessionNote?
  payment         Payment?          // null until POST /payments/create-intent is called
}

model SessionNote {
  id              String      @id @default(cuid())
  appointmentId   String      @unique
  appointment     Appointment @relation(fields: [appointmentId], references: [id])
  content         String      // therapist's private notes
  artworkUrl      String?     // uploaded artwork from session
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
}

model Availability {
  id          String           @id @default(cuid())
  therapistId String
  therapist   TherapistProfile @relation(fields: [therapistId], references: [id])
  dayOfWeek   Int              // 0 = Sunday, 6 = Saturday
  startTime   String           // "09:00"
  endTime     String           // "17:00"
}

model Review {
  id          String           @id @default(cuid())
  clientId    String
  client      User             @relation(fields: [clientId], references: [id])
  therapistId String
  therapist   TherapistProfile @relation(fields: [therapistId], references: [id])
  rating      Int              // 1–5
  comment     String?
  createdAt   DateTime         @default(now())
}

// Tracks each payment linked to an appointment.
// Amount fields are always stored as integer cents (e.g. 10000 = $100.00).
model Payment {
  id                    String        @id @default(cuid())
  appointmentId         String        @unique
  appointment           Appointment   @relation(fields: [appointmentId], references: [id])

  stripePaymentIntentId String        @unique  // "pi_xxxxx"
  stripeChargeId        String?                // "ch_xxxxx" — set after payment_intent.succeeded
  stripeTransferId      String?                // "tr_xxxxx" — auto-created by Stripe Connect
  stripeRefundId        String?                // "re_xxxxx" — set if refunded

  amount                Int                    // total charged, in cents
  currency              String        @default("usd")
  platformFeeAmount     Int                    // retained by platform, in cents
  therapistPayoutAmount Int                    // transferred to therapist, in cents

  status                PaymentStatus @default(PENDING)
  refundedAt            DateTime?
  refundAmount          Int?                   // actual refund in cents
  refundReason          String?

  createdAt             DateTime      @default(now())
  updatedAt             DateTime      @updatedAt
}

enum PaymentStatus {
  PENDING
  PROCESSING
  SUCCEEDED
  FAILED
  REFUNDED
  CANCELLED
}

// Each therapist configures their own cancellation/refund policy.
model RefundPolicy {
  id                       String           @id @default(cuid())
  therapistId              String           @unique
  therapist                TherapistProfile @relation(fields: [therapistId], references: [id])

  // Cancellations at or above this threshold before the session start → full refund.
  // Cancellations below this threshold → no refund.
  fullRefundHoursThreshold Int              @default(24)

  allowPartialRefund       Boolean          @default(false)
  partialRefundPercent     Int?             // 0–100, used only if allowPartialRefund = true

  policyDescription        String           // human-readable text shown to clients at booking

  createdAt                DateTime         @default(now())
  updatedAt                DateTime         @updatedAt
}

// Idempotency log for Stripe webhook events.
// Stripe event ID is used as the primary key — duplicate deliveries are safely ignored.
model WebhookEvent {
  id          String    @id        // Stripe event ID: "evt_xxxxx"
  type        String               // e.g. "payment_intent.succeeded"
  processed   Boolean   @default(false)
  processedAt DateTime?
  rawPayload  Json                 // full Stripe Event object for debugging/replay
  createdAt   DateTime  @default(now())
}
```

---

## API Design

All endpoints are prefixed with `/api/v1`.

### Authentication
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/auth/register` | Register new user | Public |
| POST | `/auth/login` | Login, returns JWT | Public |
| POST | `/auth/logout` | Blacklist token in Redis | Required |
| POST | `/auth/refresh` | Refresh access token | Refresh token |

### Therapists
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/therapists` | List therapists (filterable) | Public |
| GET | `/therapists/:id` | Get therapist profile + availability | Public |
| GET | `/therapists/:id/slots` | Get available time slots for a date | Public |
| PUT | `/therapists/:id` | Update own profile | Therapist |
| PUT | `/therapists/:id/availability` | Set weekly availability | Therapist |

### Appointments
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/appointments` | Book an appointment | Client |
| GET | `/appointments` | List own appointments | Client/Therapist |
| GET | `/appointments/:id` | Get single appointment | Owner |
| PATCH | `/appointments/:id/status` | Confirm or cancel | Therapist/Admin |
| DELETE | `/appointments/:id` | Cancel (client, 24h+ before) | Client |

### Session Notes
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/appointments/:id/notes` | Create session note | Therapist |
| GET | `/appointments/:id/notes` | Read session note | Therapist (owner) |
| PUT | `/appointments/:id/notes` | Update session note | Therapist (owner) |

### Admin
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/admin/users` | List all users | Admin |
| PATCH | `/admin/users/:id` | Update user role/status | Admin |
| GET | `/admin/stats` | Platform analytics | Admin |

### Payments
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/payments/create-intent` | Create Stripe PaymentIntent for an appointment | Client |
| GET | `/payments/connect/status` | Check therapist Stripe Connect account status | Therapist |
| POST | `/payments/connect/onboard` | Start Stripe Express account onboarding | Therapist |
| GET | `/payments/connect/return` | Handle Stripe redirect after onboarding completes | Public (Stripe) |
| GET | `/payments/connect/refresh` | Re-generate an expired onboarding link | Public (Stripe) |
| GET | `/payments/appointment/:id` | Get payment record for an appointment | Client/Therapist/Admin |
| GET | `/payments/admin/stats` | Revenue analytics (filterable by date range) | Admin |

### Webhooks
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/webhooks/stripe` | Receive Stripe webhook events | Stripe (signature-verified) |

---

## Frontend Workflow

### Page Routes

```
/                           → Home (hero, featured therapists, CTA)
/therapists                 → Therapist directory with filters
/therapists/:id             → Therapist profile + book button
/book/:therapistId          → Booking flow (date/time picker → payment)
/booking/confirmation       → Post-payment confirmation page (Stripe redirect target)
/login                      → Login
/register                   → Register (choose Client or Therapist role)
/dashboard                  → Redirects based on role:
  /dashboard/client         → Upcoming appointments, history
  /dashboard/therapist      → Schedule calendar, client list, notes, Stripe Connect
  /dashboard/admin          → User management, analytics, revenue stats
```

### State Management Strategy

- **Server state** (appointments, therapists, user profile): TanStack Query
  - Automatic background refetching
  - Optimistic updates for cancellations
  - Stale-while-revalidate caching
- **Auth state** (current user, token): Zustand (persisted to localStorage)
- **UI state** (modal open/close, filter values): Local `useState`

### Booking Flow (Multi-step)

```
Step 1: Select Date
  └─ Calendar UI shows therapist availability
  └─ Fetches GET /therapists/:id/slots?date=YYYY-MM-DD

Step 2: Select Time Slot
  └─ Displays available hour slots for chosen date

Step 3: Add Notes (optional)
  └─ Text field for client to describe goals/concerns

Step 4: Confirm & Pay
  └─ Displays: therapist name, date/time, session price, refund policy text
  └─ POST /appointments → creates Appointment (status: PENDING)
  └─ POST /payments/create-intent { appointmentId } → receives { clientSecret }
  └─ <PaymentElement> renders (Stripe-hosted card / Apple Pay / Google Pay)
  └─ stripe.confirmPayment() submits payment to Stripe
  └─ On success: navigate to /booking/confirmation?appointmentId=xxx
  └─ Webhook payment_intent.succeeded → Appointment becomes CONFIRMED server-side

/booking/confirmation page:
  └─ Reads ?appointmentId + ?redirect_status=succeeded from Stripe redirect
  └─ Polls GET /appointments/:id until status = CONFIRMED (TanStack Query)
  └─ Shows: receipt summary, therapist name, date/time, amount paid
  └─ Shows: "A confirmation email has been sent to you"
  └─ Link to /dashboard/client
```

---

## Backend Workflow

### Middleware Execution Order

```
Request
  → CORS
  → Helmet (security headers)
  → /webhooks/stripe  ← express.raw() only — MUST come before express.json()
  → express.json()    ← all other routes
  → rateLimiter (Redis)
  → Route handler
      → authenticate (JWT verify)
      → authorize (role check)
      → validate (Zod schema)
      → controller
          → service / Prisma query
          → response
```

### Availability & Conflict Logic

When a client requests time slots:
1. Fetch therapist's `Availability` rows for the requested `dayOfWeek`
2. Generate all possible slots (e.g., every 50 min from 09:00–17:00)
3. Query existing `Appointment` records for that therapist/date with status `PENDING` or `CONFIRMED`
4. Return slots excluding those that conflict with existing appointments

### Scheduled Jobs (node-cron)

```
Every hour:
  → Find appointments starting in 24 hours with status CONFIRMED
  → Send reminder email to client and therapist via Nodemailer

Every night at midnight:
  → Mark past CONFIRMED appointments as COMPLETED

Every 30 minutes:
  → Find Payments with status PENDING older than 30 minutes
  → stripe.paymentIntents.cancel(stripePaymentIntentId)
  → Set Payment CANCELLED, Appointment CANCELLED
  → Re-opens the time slot (prevents ghost bookings from abandoned checkouts)
```

---

## Payment Architecture

### Stripe Marketplace Model

The platform uses **Stripe Connect Express accounts**. Money flow per session:

1. Client pays the full session price — Stripe charges the client's card via a PaymentIntent
2. Stripe automatically transfers `(amount − platformFee)` to the therapist's Express account using `transfer_data.destination` on the PaymentIntent
3. Platform retains the `platformFee` (default: **15%**) via `application_fee_amount`
4. Therapists manage their bank account and tax documents through the Stripe Express Dashboard

Fee calculation always uses integer cents to avoid floating-point errors:

```typescript
const totalCents        = Math.round(Number(sessionPrice) * 100);
const platformFee       = Math.round(totalCents * PLATFORM_FEE_PERCENT / 100);
const therapistPayout   = totalCents - platformFee;
```

### Payment Flow Sequence (Booking — Step 4)

```
1. Frontend: POST /appointments
   → Creates Appointment (status: PENDING)
   → Validates therapist stripeAccountStatus = ACTIVE

2. Frontend: POST /payments/create-intent { appointmentId }
   → Backend computes amount in cents + platform fee
   → stripe.paymentIntents.create({
       amount, currency,
       application_fee_amount: platformFee,
       transfer_data: { destination: therapist.stripeAccountId },
       metadata: { appointmentId, therapistId, clientId },
       automatic_payment_methods: { enabled: true },
     })
   → Creates Payment record (status: PENDING)
   → Returns { clientSecret } to frontend

3. Frontend: renders <PaymentElement> with clientSecret
   → Client enters card/wallet details
   → stripe.confirmPayment() submits to Stripe

4. Stripe fires webhook: payment_intent.succeeded
   → Backend sets Payment.status = SUCCEEDED
   → Backend sets Appointment.status = CONFIRMED
   → Sends confirmation email to client and therapist

5. Frontend: polls GET /appointments/:id until status = CONFIRMED
   → Navigates to /booking/confirmation
```

> **Critical — webhook route ordering in `app.ts`:**
> The Stripe webhook route must be mounted **before** `express.json()`. The signature verification function `stripe.webhooks.constructEvent()` requires the raw request body buffer, not a parsed JSON object. Mounting after `express.json()` will cause all webhook verifications to fail.
>
> ```typescript
> app.use('/webhooks', stripeWebhookRouter);  // express.raw() scoped here
> app.use(express.json());                    // all other routes
> app.use('/api/v1/payments', paymentRouter);
> ```

### Stripe Connect Onboarding (Therapists)

Therapists must complete Stripe onboarding before their profile appears as bookable. The `stripeAccountStatus` field gates the booking flow.

```
1. Therapist clicks "Connect Bank Account" in their dashboard
2. Backend: stripe.accounts.create({ type: 'express', email }) → stripeAccountId saved
3. Backend: stripe.accountLinks.create({ type: 'account_onboarding' }) → url (15 min TTL)
4. Frontend: redirects browser to the Stripe-hosted onboarding URL
5. Therapist completes identity verification + bank account on Stripe's UI
6. Stripe redirects to GET /payments/connect/return
7. Backend: stripe.accounts.retrieve() → checks charges_enabled
   → stripeAccountStatus = ACTIVE (if complete) or ONBOARDING_IN_PROGRESS
8. Authoritative update: webhook account.updated fires
   → Backend syncs stripeAccountStatus based on charges_enabled / requirements
```

If the AccountLink expires mid-onboarding, `GET /payments/connect/refresh` generates a new one.

### Webhook Events Handled

All events arrive at `POST /webhooks/stripe`. Each event is deduplicated using the `WebhookEvent` table — the Stripe event ID is the primary key, so duplicate deliveries are ignored.

| Event | Action |
|---|---|
| `payment_intent.succeeded` | Set Payment `SUCCEEDED`, set Appointment `CONFIRMED`, send confirmation email |
| `payment_intent.payment_failed` | Set Payment `FAILED`; frontend shows card-declined retry prompt |
| `payment_intent.canceled` | Set Payment `CANCELLED`, set Appointment `CANCELLED` |
| `charge.refunded` | Confirm Payment `REFUNDED` after Stripe-side refund completes |
| `account.updated` | Sync therapist `stripeAccountStatus` (`ACTIVE` / `RESTRICTED` / `ONBOARDING_IN_PROGRESS`) |

### Refund Logic

Cancellations trigger `refundService.processAppointmentRefund(appointmentId)`:

1. Fetch appointment with its `Payment` and the therapist's `RefundPolicy`
2. Compute hours until session start
3. If `hoursUntilSession >= fullRefundHoursThreshold` → `stripe.refunds.create({ charge: chargeId })` — full refund
4. If below threshold → no refund; client notified by email with the policy reason
5. If the **therapist** cancels a confirmed appointment → always issue a full refund, regardless of policy

### Stale Appointment Cleanup

A new `node-cron` job runs every 30 minutes to prevent ghost bookings when clients abandon mid-payment:

```
Every 30 minutes:
  → Find Payments with status PENDING older than 30 minutes
  → stripe.paymentIntents.cancel(stripePaymentIntentId)
  → Set Payment CANCELLED, Appointment CANCELLED
  → Re-opens the time slot for other clients
```

---

## Authentication & Authorization

### JWT Strategy

- **Access Token**: short-lived (15 min), stored in memory (Zustand store)
- **Refresh Token**: long-lived (7 days), stored in `httpOnly` cookie (not accessible by JS)
- **Logout**: access token ID added to Redis blacklist (TTL = remaining token lifetime)

### Role-Based Access Control

| Role | Permissions |
|---|---|
| `CLIENT` | Book/cancel own appointments, write reviews, view own data |
| `THERAPIST` | Manage own schedule, write session notes, view assigned clients |
| `ADMIN` | Full read/write access to all resources |

---

## Development Workflow

### 1. Local Environment Bootstrap

```bash
# Start PostgreSQL and Redis via Docker
docker-compose up -d

# Install dependencies
cd server && npm install
cd ../client && npm install

# Set up database
cd ../server
npx prisma migrate dev --name init
npx prisma db seed          # optional: seed demo therapists

# Start dev servers (two terminals)
cd server && npm run dev    # Express on :3001
cd client && npm run dev    # Vite on :5173
```

### 2. Development Cycle

```
Feature branch → implement → write tests → PR → CI checks → merge
```

### 3. CI Pipeline (GitHub Actions)

On every pull request:
1. Lint (ESLint + Prettier check)
2. Type check (`tsc --noEmit`)
3. Backend tests (`jest --coverage`)
4. Frontend tests (`vitest run`)
5. Build check (`vite build`)

---

## Environment Setup

Copy `.env.example` to `.env` in the `server/` directory:

```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/arttherapy"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_ACCESS_SECRET="your-access-secret-here"
JWT_REFRESH_SECRET="your-refresh-secret-here"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Email (SMTP)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
EMAIL_FROM="Art Therapy App <noreply@arttherapy.com>"

# Cloudinary (file uploads)
CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="your-webhook-secret"  # from Stripe CLI during local dev (see below)
STRIPE_PLATFORM_FEE_PERCENT=15           # integer percentage the platform retains
STRIPE_CONNECT_RETURN_URL="http://localhost:3001/api/v1/payments/connect/return"
STRIPE_CONNECT_REFRESH_URL="http://localhost:3001/api/v1/payments/connect/refresh"

# App
PORT=3001
CLIENT_URL="http://localhost:5173"
NODE_ENV="development"
```

Copy `.env.example` to `.env` in the `client/` directory:

```env
VITE_API_URL="http://localhost:3001/api/v1"
VITE_STRIPE_PUBLISHABLE_KEY="pk_test_..."
```

### Stripe CLI (local webhook testing)

The Stripe webhook handler requires a real signature from Stripe. Use the Stripe CLI to forward events to your local server:

```bash
# Install Stripe CLI
# Windows: https://stripe.com/docs/stripe-cli (download the exe or use scoop)
# macOS:   brew install stripe/stripe-cli/stripe

stripe login
stripe listen --forward-to localhost:3001/webhooks/stripe
# The CLI prints a signing secret — copy it to server/.env as STRIPE_WEBHOOK_SECRET
```

**Test cards (use in Stripe test mode):**

| Card number | Scenario |
|---|---|
| `4242 4242 4242 4242` | Successful payment |
| `4000 0000 0000 9995` | Card declined (insufficient funds) |
| `4000 0025 0000 3155` | Requires 3DS authentication |

---

## Key Design Decisions

| Decision | Rationale |
|---|---|
| PostgreSQL over MongoDB | Appointment scheduling is inherently relational (users, slots, conflicts require joins and transactions) |
| Prisma over raw SQL | Type-safe queries, auto-generated migrations, great DX |
| TanStack Query over Redux | Server state and UI state have different lifecycles; TQ handles caching, refetching, and loading states with far less boilerplate |
| Zustand over Redux | Auth state is minimal; Zustand is lighter and avoids Redux ceremony |
| JWT + httpOnly refresh cookie | Balances statelessness (access token) with security (refresh token not accessible to XSS attacks) |
| Redis for rate limiting | In-memory speed is appropriate; rate limit counters don't need persistence |
| Monorepo structure | Shared types can be extracted into a `packages/shared` folder later without a major refactor |
| PaymentIntent created server-side | Amount and platform fee are computed server-side — prevents clients from tampering with the price in the browser |
| `transfer_data.destination` over manual Transfer | The transfer is atomic with the charge; if the charge fails, no transfer happens — simpler and safer than issuing a manual `stripe.transfers.create()` afterwards |
| Webhooks as source of truth for CONFIRMED status | Browser-to-server redirects can fail mid-flow; Stripe retries webhook delivery with exponential back-off, making it reliable for state transitions |
| Stripe Connect Express accounts | Stripe hosts the onboarding UI and handles identity verification — no custom KYC flow to build or maintain |
| `WebhookEvent` idempotency table | Stripe guarantees at-least-once delivery; using the Stripe event ID as the primary key makes duplicate processing a no-op |
| Integer cents for all money values | Eliminates floating-point rounding errors; standard practice for any financial data |
| Stale PENDING appointment cleanup (30 min cron) | Prevents ghost bookings blocking a therapist's calendar when a client abandons mid-payment; the 30-minute window also covers 3DS authentication delays |
