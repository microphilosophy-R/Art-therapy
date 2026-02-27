# Art Therapy Appointment Platform

A full-stack web application for managing art therapy appointments, group therapy programmes, payments, and client communications. The platform supports three user roles and four distinct therapy programme types, with multi-provider payment processing (Stripe, Alipay, WeChat Pay) and full English / Chinese (Mandarin) localisation.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Architecture Overview](#architecture-overview)
4. [Project Structure](#project-structure)
5. [Database Design](#database-design)
6. [API Reference](#api-reference)
7. [Key Workflows](#key-workflows)
8. [Development Setup](#development-setup)
9. [Environment Configuration](#environment-configuration)
10. [User Manuals](#user-manuals)

---

## Project Overview

### User Roles

| Role | Description |
|---|---|
| `CLIENT` | Browses therapists, books personal appointments, signs up for group plans, submits forms, and manages their session history. |
| `THERAPIST` | Manages their schedule and availability, creates and publishes therapy plans, writes session notes, sends intake forms, and connects a Stripe payout account. |
| `ADMIN` | Reviews and approves therapy plans submitted by therapists, manages platform users, and views revenue analytics. |

### Therapy Plan Types

| Type | Description |
|---|---|
| `PERSONAL_CONSULT` | Private 1-on-1 session between a single client and a therapist. Booked directly through the therapist's availability calendar. |
| `GROUP_CONSULT` | Small structured group session (one therapist, multiple clients). Requires admin approval before clients can sign up. |
| `ART_SALON` | Open single-day event focused on shared creativity and mindfulness. Supports sub-types. Requires admin approval. |
| `WELLNESS_RETREAT` | Immersive multi-day experience with a scheduled event itinerary. Requires admin approval. |

Group plans (`GROUP_CONSULT`, `ART_SALON`, `WELLNESS_RETREAT`) display live participant counts. Personal consultations maintain strict privacy with no public attendee information.

### Plan Status Lifecycle

```
DRAFT -> PENDING_REVIEW -> PUBLISHED -> SIGN_UP_CLOSED -> IN_PROGRESS -> FINISHED -> IN_GALLERY
                        -> REJECTED
  (any active stage)  -> CANCELLED
                      -> ARCHIVED
```

Admin approval is required to transition from `PENDING_REVIEW` to `PUBLISHED`. A conflict detection check runs at submission time, verifying the therapist has no overlapping confirmed appointments or active plans.

---

## Tech Stack

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| React | 18 | UI component framework |
| TypeScript | — | Type safety |
| Vite | — | Development server and production bundler |
| React Router | v6 | Client-side routing |
| TanStack Query (React Query) | v5 | Server state management, caching, background refetching |
| Zustand | — | Lightweight global state (auth store, persisted to localStorage) |
| Tailwind CSS | — | Utility-first styling |
| Radix UI primitives | — | Accessible, unstyled component primitives |
| Framer Motion | — | Page scroll animations and transitions |
| Lucide React | — | SVG icon library |
| React Hook Form | — | Form state management |
| Zod | — | Client-side schema validation |
| FullCalendar | — | Interactive appointment scheduling calendar |
| Axios | — | HTTP client with JWT Bearer token interceptors |
| @stripe/stripe-js | — | Loads Stripe.js asynchronously |
| @stripe/react-stripe-js | — | `<Elements>`, `<PaymentElement>`, `useStripe` / `useElements` hooks |
| qrcode.react | — | WeChat Pay QR code rendering |
| i18next + react-i18next | — | Internationalisation — English / Chinese (zh) |

### Backend

| Technology | Version | Purpose |
|---|---|---|
| Node.js | 20 | Runtime environment |
| Express.js | — | HTTP server and REST API framework |
| TypeScript | — | Type safety |
| Prisma ORM | — | Database schema, migrations, and type-safe queries |
| PostgreSQL | 16 | Primary relational database |
| Redis | 7 | Rate limiting, JWT token blacklist, short-lived cache |
| jsonwebtoken | — | JWT access tokens (15m) and refresh tokens (7d) |
| bcryptjs | — | Password hashing |
| Zod | — | Server-side request body validation |
| Stripe SDK | v14 | PaymentIntents, Connect Express accounts, Refunds |
| alipay-sdk | — | Alipay order creation and signature verification |
| wechatpay-axios-plugin | — | WeChat Pay v3 order creation and AES-GCM notification verification |
| Multer + Cloudinary | — | File uploads (avatars, poster images, session artwork) |
| Nodemailer | — | Email notifications (confirmations, reminders) |
| node-cron | — | Scheduled jobs (reminders, auto-completion, stale cleanup) |
| Helmet | — | HTTP security headers |
| cors | — | Cross-origin request handling |
| cookie-parser | — | httpOnly refresh token cookie parsing |

### Infrastructure

| Technology | Purpose |
|---|---|
| Docker Compose | Local PostgreSQL 16 and Redis 7 containers |

---

## Architecture Overview

```
+---------------------------------------------------------------+
|                           Browser                             |
|      React 18 + TypeScript  (Vite Dev Server / Static Build)  |
|      @stripe/react-stripe-js  |  i18next  |  Framer Motion    |
+-----------------------------+---------------------------------+
                              |
                    HTTPS / REST  (Axios + JWT Bearer Token)
                              |
+-----------------------------v---------------------------------+
|                   Express.js API Server                       |
|                  (Node.js 20 + TypeScript)                    |
|                                                               |
|   +----------+  +-----------+  +-----------+  +-----------+  |
|   |   Auth   |  | Appoint-  |  |  Therapy  |  |  Payment  |  |
|   |  Router  |  |   ments   |  |   Plans   |  |  Router   |  |
|   +----------+  +-----------+  +-----------+  +-----------+  |
|   +---------+  +--------+  +---------+  +-------------------+ |
|   |  Forms  |  |  Msgs  |  | Profile |  |  Admin / Webhooks | |
|   +---------+  +--------+  +---------+  +-------------------+ |
|                                                               |
|   +-----------------------------------------------------------+|
|   |                   Middleware Layer                        ||
|   |  Rate Limiter (Redis)  |  JWT Verify  |  Role Guard       ||
|   |  Zod Validator         |  Helmet      |  CORS             ||
|   +-----------------------------------------------------------+|
|                                                               |
+----+------------------------+------------------+--------------+
     | Prisma ORM             | ioredis          | Payment SDKs
     v                        v                  v
+----+----------+  +----------+----------+  +----+--------------+
| PostgreSQL 16 |  |       Redis 7        |  | Stripe  Platform |
| Users         |  | Token blacklist      |  | Alipay  Platform |
| Appointments  |  | Rate limit counters  |  | WeChat  Platform |
| TherapyPlans  |  | Exchange rate cache  |  +------------------+
| Payments      |  +----------------------+
| Messages      |                            +------------------+
| Forms, etc.   |                            | Cloudinary       |
+---------------+                            | (file storage)   |
                                             +------------------+
```

### Middleware Execution Order

```
Incoming Request
  -> CORS
  -> Helmet (security headers)
  -> POST /webhooks/*   <-- express.raw() scope ONLY (must precede express.json())
  -> express.json()     <-- all other routes
  -> Redis rate limiter
  -> Route matched
       -> authenticate  (JWT verify, attaches req.user)
       -> authorize     (role guard)
       -> validate      (Zod schema check)
       -> controller
            -> service / Prisma
            -> JSON response
```

---

## Project Structure

```
art-therapy-app/
|
+-- client/                              # React frontend (Vite)
|   +-- public/
|   +-- index.html
|   +-- vite.config.ts
|   +-- tailwind.config.ts
|   +-- tsconfig.json
|   +-- src/
|       +-- api/                         # Axios instance + typed API call functions
|       |   +-- axios.ts                 # Axios instance with JWT interceptor + refresh logic
|       |   +-- admin.ts
|       |   +-- alipay.ts
|       |   +-- appointments.ts
|       |   +-- auth.ts
|       |   +-- forms.ts
|       |   +-- messages.ts
|       |   +-- payments.ts
|       |   +-- profile.ts
|       |   +-- therapists.ts
|       |   +-- therapyPlans.ts
|       |   +-- wechat.ts
|       +-- components/
|       |   +-- ui/                      # Radix UI-based base components
|       |   +-- layout/                  # Navbar, Footer, Layout wrapper
|       |   +-- appointments/            # AppointmentCard
|       |   +-- messages/                # MessageItem
|       |   +-- therapists/              # TherapistCard
|       |   +-- therapyPlans/            # TherapyPlanCard, PosterSelector
|       |   +-- payments/
|       |       +-- AlipayPaymentForm.tsx
|       |       +-- PaymentElementWrapper.tsx
|       |       +-- PaymentForm.tsx
|       |       +-- PaymentMethodSelector.tsx
|       |       +-- StripeUnavailable.tsx
|       |       +-- WechatPaymentForm.tsx
|       +-- hooks/
|       |   +-- useExchangeRate.ts       # TanStack Query hook for CNY->USD rate (1h cache)
|       +-- i18n.ts                      # i18next initialisation (en / zh)
|       +-- lib/
|       |   +-- stripe.ts                # loadStripe() singleton
|       +-- locales/
|       |   +-- en.json
|       |   +-- zh.json
|       +-- pages/
|       |   +-- Home.tsx
|       |   +-- TherapistDirectory.tsx
|       |   +-- TherapistProfile.tsx
|       |   +-- BookAppointment.tsx
|       |   +-- PrivacyTerms.tsx
|       |   +-- UserProfile.tsx
|       |   +-- Gallery.tsx                    # Public gallery of IN_GALLERY plans (/gallery)
|       |   +-- auth/
|       |   |   +-- Login.tsx
|       |   |   +-- Register.tsx
|       |   +-- booking/
|       |   |   +-- BookingConfirmation.tsx
|       |   +-- Dashboard/
|       |   |   +-- ClientDashboard.tsx
|       |   |   +-- TherapistDashboard.tsx
|       |   |   +-- AdminDashboard.tsx
|       |   |   +-- tabs/
|       |   |       +-- AdminPlansTab.tsx
|       |   |       +-- MessagesTab.tsx
|       |   |       +-- TherapistPlansTab.tsx
|       |   +-- forms/
|       |   |   +-- ComposeForm.tsx
|       |   |   +-- FillForm.tsx
|       |   |   +-- FormDetail.tsx
|       |   +-- therapy-plans/
|       |       +-- CreateTherapyPlan.tsx
|       |       +-- EditTherapyPlan.tsx
|       |       +-- TherapyPlanDetail.tsx
|       |       +-- TherapyPlanForm.tsx
|       |       +-- TherapyPlansDirectory.tsx
|       +-- store/
|       |   +-- authStore.ts             # Zustand auth store (persisted to localStorage)
|       +-- types/
|       |   +-- index.ts                 # Shared TypeScript interfaces
|       |   +-- payment.types.ts
|       +-- utils/
|           +-- cn.ts                    # Tailwind class merge helper
|           +-- formatters.ts            # Date and currency formatters
|           +-- therapyPlanUtils.ts
|
+-- server/                              # Express backend
|   +-- prisma/
|   |   +-- schema.prisma                # Full database schema (19 models)
|   |   +-- seed.ts                      # Demo data seeder
|   |   +-- migrations/                  # Auto-generated Prisma migration files
|   +-- tsconfig.json
|   +-- src/
|       +-- app.ts                       # Express app setup, middleware, route mounting
|       +-- server.ts                    # Entry point
|       +-- test-fx.ts                   # Exchange rate API diagnostic script
|       +-- routes/
|       |   +-- admin.routes.ts
|       |   +-- alipay.routes.ts
|       |   +-- appointment.routes.ts
|       |   +-- auth.routes.ts
|       |   +-- form.routes.ts
|       |   +-- message.routes.ts
|       |   +-- payment.routes.ts
|       |   +-- profile.routes.ts
|       |   +-- therapist.routes.ts
|       |   +-- therapyPlan.routes.ts
|       |   +-- wechat.routes.ts
|       +-- controllers/
|       |   +-- alipay.controller.ts
|       |   +-- appointment.controller.ts
|       |   +-- auth.controller.ts
|       |   +-- form.controller.ts
|       |   +-- message.controller.ts
|       |   +-- payment.controller.ts
|       |   +-- profile.controller.ts
|       |   +-- therapist.controller.ts
|       |   +-- therapyPlan.controller.ts
|       |   +-- user.controller.ts
|       |   +-- wechat.controller.ts
|       +-- middleware/
|       |   +-- authenticate.ts          # JWT verification (blocks unauthenticated requests)
|       |   +-- authorize.ts             # Role-based access guard
|       |   +-- optionalAuthenticate.ts  # Attaches user if token present; non-blocking
|       |   +-- rateLimiter.ts           # Redis-backed rate limiter
|       |   +-- validate.ts              # Zod schema request body validator
|       +-- services/
|       |   +-- alipay.service.ts
|       |   +-- email.service.ts         # Nodemailer templates
|       |   +-- message.service.ts       # In-app message creation logic
|       |   +-- refund.service.ts        # Refund eligibility and processing
|       |   +-- scheduler.service.ts     # node-cron jobs
|       |   +-- stripe.service.ts        # All Stripe SDK calls
|       |   +-- upload.service.ts        # Cloudinary integration
|       |   +-- wechat.service.ts
|       +-- webhooks/
|       |   +-- alipay.webhook.ts
|       |   +-- stripe.webhook.ts
|       |   +-- wechat.webhook.ts
|       +-- schemas/                     # Zod validation schemas per domain
|       |   +-- appointment.schemas.ts
|       |   +-- auth.schemas.ts
|       |   +-- form.schemas.ts
|       |   +-- message.schemas.ts
|       |   +-- payment.schemas.ts
|       |   +-- therapist.schemas.ts
|       |   +-- therapyPlan.schemas.ts
|       |   +-- user.schemas.ts
|       +-- lib/
|       |   +-- alipay.ts               # Alipay SDK client singleton
|       |   +-- prisma.ts               # Prisma client singleton
|       |   +-- redis.ts                # Redis client singleton
|       |   +-- stripe.ts               # Stripe client singleton
|       |   +-- wechat.ts               # WeChat Pay client singleton
|       +-- types/
|           +-- express.d.ts            # Express Request type augmentation
|
+-- docker-compose.yml                  # PostgreSQL + Redis containers
+-- README.md
```

---

## Database Design

### Entity-Relationship Summary

The schema contains 19 models. The core relationships are:

```
User (1) ──────────── (0..1) TherapistProfile
User (1) ──────────── (N)    Appointment          [as client]
User (1) ──────────── (N)    TherapyPlanParticipant
User (1) ──────────── (N)    Review               [as client]
User (1) ──────────── (N)    Message              [as recipient or sender]

TherapistProfile (1) ─ (N)   Appointment
TherapistProfile (1) ─ (N)   Availability
TherapistProfile (1) ─ (N)   Review
TherapistProfile (1) ─ (0..1) RefundPolicy
TherapistProfile (1) ─ (N)   TherapyPlan
TherapistProfile (1) ─ (N)   ClientForm
TherapistProfile (1) ─ (N)   TherapyPlanTemplate

Appointment (1) ────── (0..1) SessionNote
Appointment (1) ────── (0..1) Payment

TherapyPlan (1) ──────(N)    TherapyPlanEvent
TherapyPlan (1) ──────(N)    TherapyPlanParticipant

TherapyPlanParticipant (1) ── (0..1) PlanPayment

ClientForm (1) ────── (N)    FormQuestion
ClientForm (1) ────── (N)    FormResponse
FormResponse (1) ───── (N)   FormAnswer
```

### Key Models (Prisma Schema Snippets)

```prisma
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  role         Role     @default(CLIENT)  // CLIENT | THERAPIST | ADMIN
  firstName    String
  lastName     String
  phone        String?
  avatarUrl    String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  therapistProfile       TherapistProfile?
  appointmentsAsClient   Appointment[]             @relation("ClientAppointments")
  reviews                Review[]
  planParticipations     TherapyPlanParticipant[]
  sentMessages           Message[]                 @relation("SentMessages")
  receivedMessages       Message[]                 @relation("ReceivedMessages")
}

model TherapistProfile {
  id                  String              @id @default(cuid())
  userId              String              @unique
  user                User                @relation(fields: [userId], references: [id])
  bio                 String
  specialties         String[]
  sessionPrice        Decimal
  locationCity        String
  isAccepting         Boolean             @default(true)
  rating              Float?
  stripeAccountId     String?
  stripeAccountStatus StripeAccountStatus @default(NOT_CONNECTED)

  appointments   Appointment[]
  availability   Availability[]
  reviews        Review[]
  refundPolicy   RefundPolicy?
  therapyPlans   TherapyPlan[]
  forms          ClientForm[]
  templates      TherapyPlanTemplate[]
}

enum StripeAccountStatus {
  NOT_CONNECTED
  ONBOARDING_IN_PROGRESS
  ACTIVE
  RESTRICTED
  DISABLED
}

model Appointment {
  id          String            @id @default(cuid())
  clientId    String
  client      User              @relation("ClientAppointments", fields: [clientId], references: [id])
  therapistId String
  therapist   TherapistProfile  @relation(fields: [therapistId], references: [id])
  startTime   DateTime
  endTime     DateTime
  status      AppointmentStatus @default(PENDING)
  medium      SessionMedium     @default(IN_PERSON)
  clientNotes String?
  createdAt   DateTime          @default(now())

  sessionNote SessionNote?
  payment     Payment?
}

enum AppointmentStatus {
  PENDING
  CONFIRMED
  IN_PROGRESS
  CANCELLED
  COMPLETED
}

enum SessionMedium {
  IN_PERSON
  VIDEO
}

model Payment {
  id                    String        @id @default(cuid())
  appointmentId         String        @unique
  appointment           Appointment   @relation(fields: [appointmentId], references: [id])
  provider              PaymentProvider
  stripePaymentIntentId String?       @unique
  externalOrderId       String?
  externalTradeNo       String?
  amount                Int           // total in smallest currency unit (cents / fen)
  currency              String        @default("cny")
  platformFeeAmount     Int
  therapistPayoutAmount Int
  status                PaymentStatus @default(PENDING)
  refundedAt            DateTime?
  refundAmount          Int?
  createdAt             DateTime      @default(now())
  updatedAt             DateTime      @updatedAt
}

enum PaymentProvider {
  STRIPE
  ALIPAY
  WECHAT_PAY
}

enum PaymentStatus {
  PENDING
  PROCESSING
  SUCCEEDED
  FAILED
  REFUNDED
  CANCELLED
}

model RefundPolicy {
  id                       String           @id @default(cuid())
  therapistId              String           @unique
  therapist                TherapistProfile @relation(fields: [therapistId], references: [id])
  fullRefundHoursThreshold Int              @default(24)
  allowPartialRefund       Boolean          @default(false)
  partialRefundPercent     Int?
  policyDescription        String
  createdAt                DateTime         @default(now())
  updatedAt                DateTime         @updatedAt
}

model WebhookEvent {
  id          String    @id   // provider event ID — acts as idempotency key
  provider    String          // "STRIPE" | "ALIPAY" | "WECHAT_PAY"
  externalId  String
  processed   Boolean   @default(false)
  processedAt DateTime?
  createdAt   DateTime  @default(now())
}

model TherapyPlan {
  id              String          @id @default(cuid())
  therapistId     String
  therapist       TherapistProfile @relation(fields: [therapistId], references: [id])
  type            PlanType
  title           String
  introduction    String
  startTime       DateTime
  endTime         DateTime
  location        String?
  maxParticipants Int?
  price           Decimal?        // null for PERSONAL_CONSULT
  status          PlanStatus      @default(DRAFT)
  contactInfo     String?
  sessionMedium   SessionMedium?  // for PERSONAL_CONSULT only
  artSalonSubType String?         // for ART_SALON only
  posterUrl       String?
  customPosterUrl String?
  reviewNote      String?         // admin feedback on rejection
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  events       TherapyPlanEvent[]
  participants TherapyPlanParticipant[]
}

enum PlanType {
  PERSONAL_CONSULT
  GROUP_CONSULT
  ART_SALON
  WELLNESS_RETREAT
}

enum PlanStatus {
  DRAFT
  PENDING_REVIEW
  PUBLISHED
  REJECTED
  SIGN_UP_CLOSED
  IN_PROGRESS
  FINISHED
  IN_GALLERY
  CANCELLED
  ARCHIVED
}

model TherapyPlanParticipant {
  id         String      @id @default(cuid())
  userId     String
  user       User        @relation(fields: [userId], references: [id])
  planId     String
  plan       TherapyPlan @relation(fields: [planId], references: [id])
  status     ParticipantStatus @default(SIGNED_UP)
  enrolledAt DateTime    @default(now())

  payment    PlanPayment?
}

enum ParticipantStatus {
  SIGNED_UP
  CANCELLED
}

model PlanPayment {
  id                    String            @id @default(cuid())
  participantId         String            @unique
  participant           TherapyPlanParticipant @relation(fields: [participantId], references: [id])
  provider              PaymentProvider
  amount                Int
  currency              String
  platformFeeAmount     Int
  therapistPayoutAmount Int
  status                PaymentStatus     @default(PENDING)
  refundedAt            DateTime?
  refundAmount          Int?
  createdAt             DateTime          @default(now())
  updatedAt             DateTime          @updatedAt
}

model ClientForm {
  id          String      @id @default(cuid())
  therapistId String
  therapist   TherapistProfile @relation(fields: [therapistId], references: [id])
  clientId    String?
  title       String
  status      FormStatus  @default(DRAFT)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  questions   FormQuestion[]
  responses   FormResponse[]
}

enum FormStatus {
  DRAFT
  SENT
  SUBMITTED
  ARCHIVED
}

model FormQuestion {
  id           String       @id @default(cuid())
  formId       String
  form         ClientForm   @relation(fields: [formId], references: [id])
  order        Int
  questionText String
  type         QuestionType
  options      String[]
  required     Boolean      @default(false)
}

enum QuestionType {
  SHORT_TEXT
  LONG_TEXT
  SINGLE_CHOICE
  MULTIPLE_CHOICE
  SCALE
  YES_NO
}

model Message {
  id          String        @id @default(cuid())
  recipientId String
  recipient   User          @relation("ReceivedMessages", fields: [recipientId], references: [id])
  senderId    String?
  sender      User?         @relation("SentMessages", fields: [senderId], references: [id])
  body        String
  isRead      Boolean       @default(false)
  trigger     MessageTrigger @default(MANUAL)
  createdAt   DateTime      @default(now())
}

enum MessageTrigger {
  PLAN_SUBMITTED
  PLAN_APPROVED
  PLAN_REJECTED
  MANUAL
  APPOINTMENT_DEADLINE_WARNING
  APPOINTMENT_AUTO_CANCELLED
  PLAN_SIGNUP
  PLAN_SIGNUP_CANCELLED
  PLAN_STARTED
  PLAN_FINISHED
  PLAN_CANCELLED_BY_THERAPIST
}
```

---

## API Reference

All endpoints are prefixed with `/api/v1`.

### Auth

| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/auth/register` | Register a new user account | Public |
| POST | `/auth/login` | Login; returns access token + sets refresh cookie | Public |
| POST | `/auth/logout` | Blacklist access token in Redis | Authenticated |
| POST | `/auth/refresh` | Issue a new access token using the refresh cookie | Refresh token |
| GET | `/auth/me` | Return the currently authenticated user | Authenticated |

### Appointments

| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/appointments` | Book a new personal appointment | CLIENT |
| GET | `/appointments` | List own appointments (filtered by role) | Authenticated |
| GET | `/appointments/:id` | Get a single appointment by ID | Owner |
| PATCH | `/appointments/:id/status` | Update appointment status (confirm, in-progress) | THERAPIST / ADMIN |
| DELETE | `/appointments/:id` | Cancel an appointment | CLIENT |
| POST | `/appointments/:id/notes` | Create a session note | THERAPIST |
| GET | `/appointments/:id/notes` | Read session notes for an appointment | THERAPIST |

### Therapists

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/therapists` | List all therapist profiles (with filters) | Public |
| GET | `/therapists/:id` | Get therapist profile and availability | Public |
| GET | `/therapists/:id/slots` | Get available booking slots for a given date | Public |
| PUT | `/therapists/:id/availability` | Set weekly availability blocks | THERAPIST (owner) |

### Therapy Plans

| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/therapy-plans` | Create a new therapy plan (DRAFT) | THERAPIST |
| GET | `/therapy-plans` | List published therapy plans (or own drafts) | Public / Authenticated |
| GET | `/therapy-plans/:id` | Get a therapy plan by ID | Public / Authenticated |
| PUT | `/therapy-plans/:id` | Update a DRAFT or REJECTED plan | THERAPIST (owner) |
| DELETE | `/therapy-plans/:id` | Delete a DRAFT plan | THERAPIST (owner) |
| POST | `/therapy-plans/:id/submit` | Submit plan for admin review (PENDING_REVIEW) | THERAPIST (owner) |
| POST | `/therapy-plans/:id/review` | Approve or reject a submitted plan | ADMIN |
| POST | `/therapy-plans/:id/close-signup` | Close sign-ups (SIGN_UP_CLOSED) | THERAPIST (owner) |
| POST | `/therapy-plans/:id/start` | Mark plan as started (IN_PROGRESS) | THERAPIST (owner) |
| POST | `/therapy-plans/:id/finish` | Mark plan as finished (FINISHED) | THERAPIST (owner) |
| POST | `/therapy-plans/:id/to-gallery` | Move finished plan to gallery (IN_GALLERY) | THERAPIST (owner) |
| POST | `/therapy-plans/:id/cancel-plan` | Cancel an active plan; refunds all participants | THERAPIST (owner) / ADMIN |
| POST | `/therapy-plans/:id/signup` | Sign up and pay for a group plan | CLIENT |
| DELETE | `/therapy-plans/:id/signup` | Cancel sign-up; triggers refund | CLIENT |

### Payments (Stripe)

| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/payments/create-intent` | Create a Stripe PaymentIntent for an appointment | CLIENT |
| GET | `/payments/connect/status` | Check the therapist's Stripe Connect account status | THERAPIST |
| POST | `/payments/connect/onboard` | Start Stripe Express account onboarding | THERAPIST |
| GET | `/payments/appointment/:id` | Get the payment record for an appointment | Authenticated |
| GET | `/payments/admin/stats` | Platform revenue analytics (filterable by date) | ADMIN |

### Alipay

| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/alipay/create-order` | Create an Alipay trade order | CLIENT |
| GET | `/alipay/order-status/:outTradeNo` | Poll Alipay order status | Authenticated |

### WeChat Pay

| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/wechat/create-order` | Create a WeChat Pay native order; returns QR code URL | CLIENT |
| GET | `/wechat/order-status/:outTradeNo` | Poll WeChat Pay order status | Authenticated |

### Forms

| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/forms` | Create a new intake / session form | THERAPIST |
| GET | `/forms` | List forms (own forms for therapist; received forms for client) | Authenticated |
| GET | `/forms/:id` | Get a form with its questions | Authenticated |
| POST | `/forms/:id/send` | Send form to a client (SENT) | THERAPIST |
| POST | `/forms/:id/submit` | Submit completed form answers (SUBMITTED) | CLIENT |
| GET | `/forms/:id/responses` | View all responses for a form | THERAPIST |

### Messages

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/messages` | List all messages for the authenticated user | Authenticated |
| GET | `/messages/unread-count` | Get unread message count | Authenticated |
| PATCH | `/messages/:id/read` | Mark a single message as read | Authenticated |
| PATCH | `/messages/mark-all-read` | Mark all messages as read | Authenticated |
| POST | `/messages` | Send a broadcast message to all users | ADMIN |

### Profile

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/profile` | Get own user profile | Authenticated |
| PATCH | `/profile` | Update own profile fields | Authenticated |
| PATCH | `/profile/password` | Change password | Authenticated |
| POST | `/profile/consent` | Record consent to terms and privacy policy | Authenticated |

### Admin

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/admin/users` | List all platform users | ADMIN |
| PATCH | `/admin/users/:id` | Update a user's role or status | ADMIN |
| GET | `/admin/stats` | Platform usage and revenue statistics | ADMIN |

### Webhooks

| Method | Endpoint | Description | Verification |
|---|---|---|---|
| POST | `/webhooks/stripe` | Receive Stripe webhook events | Stripe signature header |
| POST | `/webhooks/alipay` | Receive Alipay async payment notifications | Alipay RSA signature |
| POST | `/webhooks/wechat` | Receive WeChat Pay payment notifications | AES-GCM decryption |

---

## Key Workflows

### 1. Personal Consultation Booking

```
1. CLIENT browses /therapists and selects a therapist.

2. CLIENT views the therapist's profile and picks an available slot
   via FullCalendar. Available slots are computed server-side:
     -> GET /therapists/:id/slots?date=YYYY-MM-DD
     -> Server fetches Availability rows for that dayOfWeek
     -> Generates candidate slots (e.g. every 50 min from 09:00-17:00)
     -> Excludes slots conflicting with existing PENDING or CONFIRMED appointments
     -> Returns available time windows

3. CLIENT selects slot, chooses medium (IN_PERSON / VIDEO),
   optionally enters notes, and proceeds to payment.

4. CLIENT submits booking:
     -> POST /appointments
        Body: { therapistId, startTime, endTime, medium, clientNotes }
        Server validates therapist Stripe Connect status = ACTIVE
        Server creates Appointment (status: PENDING)
        Returns { appointmentId }

5. CLIENT initiates payment:
     -> POST /payments/create-intent  { appointmentId }
        Server computes amount in cents and platform fee (15%)
        Server calls stripe.paymentIntents.create()
        Server creates Payment record (status: PENDING)
        Returns { clientSecret }

   OR for Alipay:
     -> POST /alipay/create-order  { appointmentId }
        Returns { payUrl } -- browser redirects to Alipay payment page

   OR for WeChat Pay:
     -> POST /wechat/create-order  { appointmentId }
        Returns { codeUrl } -- frontend renders QR code for scanning

6. Payment completed. Payment provider fires webhook to server:
     -> POST /webhooks/stripe  (or /alipay or /wechat)
        Server deduplicates via WebhookEvent table
        Server sets Payment.status = SUCCEEDED
        Server sets Appointment.status = CONFIRMED
        Server sends confirmation email to client and therapist via Nodemailer
        Server creates in-app Message records for both parties

7. Frontend polls GET /appointments/:id until status = CONFIRMED.
   Displays booking confirmation with session details and receipt.

Automated background jobs:
  At 48h before start:
    -> node-cron finds CONFIRMED appointments starting in ~48h
    -> Sends deadline warning message to therapist
  At 24h before start (if therapist has not confirmed):
    -> Auto-cancellation job fires
    -> Appointment set to CANCELLED
    -> Client receives APPOINTMENT_AUTO_CANCELLED message
  Daily midnight:
    -> Past CONFIRMED appointments set to COMPLETED
  Every 30 minutes:
    -> PENDING payments older than 30 minutes are cancelled
    -> Corresponding appointments are cancelled
    -> Time slots are freed for rebooking
```

### 2. Group Plan Lifecycle

```
THERAPIST creates plan:
  -> POST /therapy-plans
     Type: GROUP_CONSULT | ART_SALON | WELLNESS_RETREAT
     Status begins at DRAFT
     Therapist sets title, dates, location, price, max participants,
     event schedule (TherapyPlanEvents), and poster image

THERAPIST submits for review:
  -> POST /therapy-plans/:id/submit
     Server runs conflict detection:
       - Checks for overlapping CONFIRMED appointments for this therapist
       - Checks for overlapping active TherapyPlans for this therapist
     If no conflicts: status -> PENDING_REVIEW
     Admin receives in-app message with trigger PLAN_SUBMITTED

ADMIN reviews:
  -> POST /therapy-plans/:id/review
     Body: { approved: true } or { approved: false, reviewNote: "..." }
     On approval:   status -> PUBLISHED, therapist notified (PLAN_APPROVED)
     On rejection:  status -> REJECTED,  therapist notified (PLAN_REJECTED)
                    Therapist can edit and resubmit

CLIENTS sign up (while plan is PUBLISHED):
  -> POST /therapy-plans/:id/signup
     Server creates TherapyPlanParticipant (status: SIGNED_UP)
     Payment is collected immediately (Stripe / Alipay / WeChat Pay)
     PlanPayment record created
     Therapist receives PLAN_SIGNUP message
     Server enforces maxParticipants limit

THERAPIST closes sign-ups:
  -> POST /therapy-plans/:id/close-signup
     Status -> SIGN_UP_CLOSED
     No further sign-ups accepted

THERAPIST starts the session:
  -> POST /therapy-plans/:id/start
     Status -> IN_PROGRESS
     All participants receive PLAN_STARTED message

THERAPIST finishes the session:
  -> POST /therapy-plans/:id/finish
     Status -> FINISHED
     All participants receive PLAN_FINISHED message

THERAPIST moves to gallery:
  -> POST /therapy-plans/:id/to-gallery
     Status -> IN_GALLERY
     Plan appears in the public programme gallery

Cancellation (at any active stage):
  -> POST /therapy-plans/:id/cancel-plan (THERAPIST owner or ADMIN)
     Status -> CANCELLED
     All SIGNED_UP participants receive PLAN_CANCELLED_BY_THERAPIST message
     Refund service processes full refund for every participant's PlanPayment
```

### 3. Intake / Session Form Workflow

```
THERAPIST creates form:
  -> POST /forms
     Body: { title, questions: [{ questionText, type, options, required, order }] }
     Supported question types:
       SHORT_TEXT | LONG_TEXT | SINGLE_CHOICE | MULTIPLE_CHOICE | SCALE | YES_NO
     Status begins at DRAFT

THERAPIST sends form to a client:
  -> POST /forms/:id/send  { clientId }
     Status -> SENT
     Client receives an in-app message notification

CLIENT views and fills the form:
  -> GET /forms/:id
     Returns form with all questions
  -> POST /forms/:id/submit
     Body: { answers: [{ questionId, value }] }
     Creates FormResponse and FormAnswer records
     Status -> SUBMITTED

THERAPIST reviews responses:
  -> GET /forms/:id/responses
     Returns all FormResponse records with associated FormAnswers
```

### 4. Conflict Detection (Plan Submission)

When a therapist submits a therapy plan for review, the server performs two overlap checks against the plan's `startTime` / `endTime` window:

1. **Appointment conflicts** — Queries for any `Appointment` records assigned to the therapist with status `CONFIRMED` or `IN_PROGRESS` that overlap the plan's time range.
2. **Plan conflicts** — Queries for any `TherapyPlan` records owned by the same therapist with an active status (`PUBLISHED`, `SIGN_UP_CLOSED`, `IN_PROGRESS`) that overlap the plan's time range.

If any conflicts are found, the submission is rejected with a `409 Conflict` response listing the conflicting resources. The therapist must adjust the plan's dates before resubmitting.

### 5. Payment Provider Selection

The payment method shown to clients on the booking page is influenced by the active UI language:

- When the UI language is Chinese (`zh`), Alipay is pre-selected by default.
- When the UI language is English (`en`), Stripe card payment is shown first.

Clients can always switch to any available payment method. Stripe card payment is gated by `VITE_PAYMENTS_ENABLED`. Alipay and WeChat Pay are gated by `VITE_ALIPAY_WECHAT_ENABLED`.

### 6. Exchange Rate Display

Session prices are stored in Chinese Yuan (CNY). Display behaviour by language:

- **Chinese UI (`zh`)**: Prices shown as `¥500.00` only.
- **English UI (`en`)**: Prices shown as `¥500.00` with a live USD equivalent, e.g. `~ $68.50`.

The conversion rate is fetched server-side through a proxy endpoint to avoid browser CORS restrictions:

```
GET /api/v1/fx?from=CNY&to=USD&money=1
  -> Server calls cn.apihz.cn exchange rate API
  -> Returns { rate: "0.1370" }
  -> Client-side hook (useExchangeRate) caches result for 1 hour
```

---

## Development Setup

### Prerequisites

- Node.js 20 or later
- Docker and Docker Compose

### Step-by-Step

**1. Clone the repository**

```bash
git clone <repository-url>
cd art-therapy-app
```

**2. Start the database and cache services**

```bash
docker-compose up -d
```

This starts PostgreSQL 16 on port 5432 and Redis 7 on port 6379.

**3. Configure and start the backend**

```bash
cd server
cp .env.example .env
# Edit .env and fill in all required values (see Environment Configuration below)
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev
```

The API server starts on `http://localhost:3001`.

**4. Configure and start the frontend**

```bash
cd ../client
cp .env.example .env
# Edit .env and fill in the required values
npm install
npm run dev
```

The frontend starts on `http://localhost:5173`.

### Testing Webhooks Locally

Stripe webhook events require a real signature from Stripe. Use the Stripe CLI to forward events to your local server:

```bash
stripe login
stripe listen --forward-to localhost:3001/webhooks/stripe
# Copy the printed signing secret into server/.env as STRIPE_WEBHOOK_SECRET
```

**Stripe test card numbers:**

| Card number | Scenario |
|---|---|
| `4242 4242 4242 4242` | Successful payment |
| `4000 0000 0000 9995` | Card declined (insufficient funds) |
| `4000 0025 0000 3155` | Requires 3D Secure authentication |

### Scheduled Jobs

The following `node-cron` jobs run automatically when the server is running:

| Schedule | Job |
|---|---|
| Every hour | Find CONFIRMED appointments starting in ~48h; send deadline warning messages to therapists |
| Every 30 minutes | Cancel PENDING payments and appointments older than 30 minutes (abandoned checkout cleanup) |
| Daily at midnight | Mark past CONFIRMED appointments as COMPLETED |

---

## Environment Configuration

### Server (`server/.env`)

```env
# ── Database ──────────────────────────────────────────────────
DATABASE_URL="postgresql://postgres:password@localhost:5432/arttherapy"

# ── Redis ─────────────────────────────────────────────────────
REDIS_URL="redis://localhost:6379"

# ── JWT ───────────────────────────────────────────────────────
JWT_ACCESS_SECRET="replace-with-a-long-random-string"
JWT_REFRESH_SECRET="replace-with-a-different-long-random-string"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# ── App ───────────────────────────────────────────────────────
PORT=3001
CLIENT_URL="http://localhost:5173"
NODE_ENV="development"

# ── Email (SMTP) ──────────────────────────────────────────────
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
EMAIL_FROM="Art Therapy App <noreply@arttherapy.com>"

# ── File Uploads (Cloudinary) ─────────────────────────────────
CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""

# ── Stripe ────────────────────────────────────────────────────
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."      # From Stripe CLI during local development
STRIPE_PLATFORM_FEE_PERCENT=15         # Integer: percentage retained by the platform
STRIPE_CONNECT_RETURN_URL="http://localhost:3001/api/v1/payments/connect/return"
STRIPE_CONNECT_REFRESH_URL="http://localhost:3001/api/v1/payments/connect/refresh"

# ── Alipay ────────────────────────────────────────────────────
ALIPAY_APP_ID=""
ALIPAY_PRIVATE_KEY=""
ALIPAY_PUBLIC_KEY=""
ALIPAY_GATEWAY="https://openapi.alipay.com/gateway.do"
ALIPAY_NOTIFY_URL="https://yourdomain.com/webhooks/alipay"
ALIPAY_WECHAT_ENABLED=false

# ── WeChat Pay ────────────────────────────────────────────────
WECHAT_APP_ID=""
WECHAT_MCH_ID=""
WECHAT_PRIVATE_KEY=""
WECHAT_SERIAL_NO=""
WECHAT_API_V3_KEY=""
WECHAT_NOTIFY_URL="https://yourdomain.com/webhooks/wechat"

# ── Exchange Rate API (cn.apihz.cn) ──────────────────────────
# Register a free account at https://www.apihz.cn for your own key.
# The default demo key (88888888) is shared and rate-limited.
APIHZ_ID="88888888"
APIHZ_KEY="88888888"
```

### Client (`client/.env`)

```env
VITE_API_URL=http://localhost:3001/api/v1
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_PAYMENTS_ENABLED=true
VITE_ALIPAY_WECHAT_ENABLED=false
```

| Variable | Description |
|---|---|
| `VITE_API_URL` | Base URL for all API requests |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key used to initialise Stripe.js |
| `VITE_PAYMENTS_ENABLED` | Set to `false` to hide Stripe card payment UI |
| `VITE_ALIPAY_WECHAT_ENABLED` | Set to `true` to show Alipay and WeChat Pay options |

### Enabling Alipay and WeChat Pay

1. Register merchant accounts on [Alipay Open Platform](https://open.alipay.com) and [WeChat Pay](https://pay.weixin.qq.com).
2. Populate the `ALIPAY_*` and `WECHAT_*` variables in `server/.env`.
3. Set `ALIPAY_WECHAT_ENABLED=true` in `server/.env`.
4. Set `VITE_ALIPAY_WECHAT_ENABLED=true` in `client/.env`.
5. Rebuild and restart both services.

### Authentication Token Strategy

| Token | Lifetime | Storage | Notes |
|---|---|---|---|
| Access token | 15 minutes | Zustand store (memory) | Sent as `Authorization: Bearer <token>` header |
| Refresh token | 7 days | `httpOnly` cookie | Not accessible to JavaScript; sent automatically by the browser |
| Logout | Immediate | Redis blacklist | Access token ID stored in Redis with TTL equal to its remaining lifetime |

### Role-Based Access Control

| Role | Key Permissions |
|---|---|
| `CLIENT` | Book and cancel appointments, sign up for group plans, submit forms, view own data |
| `THERAPIST` | Manage schedule, create and publish therapy plans, write session notes, send forms, connect Stripe account |
| `ADMIN` | Approve or reject therapy plans, manage all users, view platform analytics, send broadcast messages |

---

## User Manuals

Role-specific guides for end users are located in the [`docs/`](docs/) directory:

| Manual | Audience | Path |
|---|---|---|
| Client Manual | Clients booking sessions and signing up for group plans | [`docs/manual-client.md`](docs/manual-client.md) |
| Therapist Manual | Therapists managing their profile, plans, and clients | [`docs/manual-therapist.md`](docs/manual-therapist.md) |
| Administrator Manual | Platform administrators reviewing plans and managing users | [`docs/manual-admin.md`](docs/manual-admin.md) |
