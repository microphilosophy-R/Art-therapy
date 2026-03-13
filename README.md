# Art Therapy App

Full-stack platform for therapy appointments, therapy plans, forms, e-commerce, payments, and member-to-member messaging.

## Overview

This repo is a monorepo with two separate Node.js projects:

- `server/`: Express + Prisma + PostgreSQL + Redis + Socket.IO
- `client/`: React + Vite + TypeScript + TanStack Query

There is no root `package.json`.

## Role and Capability Model

System roles:

- `MEMBER`
- `ADMIN`

Certificate types for `MEMBER`:

- `THERAPIST`
- `COUNSELOR`
- `ARTIFICER`

Certificate status lifecycle:

- `PENDING`
- `APPROVED`
- `REJECTED`
- `REVOKED`

Capabilities are enforced by backend middleware (`authorize(...)` + `requireCertificate(...)`) plus plan-type-specific checks in therapy-plan controllers.

## Key Features

- Public therapist directory and profile pages
- Appointment booking and payment
- Unified therapy plan and product editors with shared stepper guidance
- Therapy plan creation workflow with certificate split:
  - `COUNSELOR` can create/edit `PERSONAL_CONSULT` and `GROUP_CONSULT`
  - `THERAPIST` can create/edit `ART_SALON` and `WELLNESS_RETREAT`
- Personal consult plans are display/schedule configuration only; booking is handled via appointment APIs
- Invite-friend/coupon step is enabled for `GROUP_CONSULT`, `ART_SALON`, and `WELLNESS_RETREAT` checkout flows (not `PERSONAL_CONSULT`)
- Product creation workflow with required poster + optional gallery/video media (artificer certificate required)
- Cart, checkout, address selection, orders, and payment webhook processing
- Member follow system (`MEMBER` <-> `MEMBER` only)
- Direct chat with Socket.IO real-time updates
- Chat guardrail: one consecutive message max until the other side replies
- Bilingual content support (`zh`/`en`) with translation checkpoint editing
- Member address book management for delivery profiles (up to 6 saved addresses)

## Recent Updates (2026-03-13)

- Completed provider certificate split for therapy-plan authoring:
  - Counselor-only for consult plans (`PERSONAL_CONSULT`, `GROUP_CONSULT`)
  - Therapist-only for non-consult plans (`ART_SALON`, `WELLNESS_RETREAT`)
- Updated therapy-plan, template, appointment-provider, and provider payment-connect route guards to accept provider certificates (`THERAPIST` or `COUNSELOR`) where needed.
- Updated creator visibility/edit guards so counselor-owned plans are fully accessible in dashboard/detail/edit flows.
- Kept personal consult as schedule/display configuration only; real booking remains appointment-based.
- Switched invite/coupon step visibility to non-personal plan checkout flows only.

## Recent Updates (2026-03-07)

- Personal consult scheduling was refactored to use a date range + daily working window model (`Asia/Shanghai` / UTC+8) with derived plan window timestamps for consistency.
- Therapy plan conflict detection was moved to Step 2 progression checks, while submit-time conflict validation remains as a backend safety net.
- Public therapy plan visibility is now strictly gated by review metadata (`reviewedAt` + `publishedAt`) in addition to public lifecycle status.
- Added one-time DB consistency backfill for personal consult schedule windows and a consolidated backfill runner command: `npm run db:backfill:all`.
- Legacy/temporary cleanup completed for obsolete one-time scripts and generated debug/build artifact files.

## Recent Updates (2026-03-06)

- Product media parity landed in the wizard: Step 1 now requires a poster (default public posters or custom upload), and Step 2 supports optional gallery images and optional video; product media fields now persist poster/video explicitly.
- Product and therapy editor wizards now use a unified stepper pattern with equal-width, continuous step segments for consistent cross-flow guidance.
- Translation checkpoint UX was inserted as a dedicated step with side-by-side source/result editing (left/right by UI language pair), plus translate/skip/manual-review progression gating.
- Member address book and checkout were upgraded: members can manage saved delivery addresses and checkout now runs a 3-step flow (address, confirmation, payment).
- Product cover fallback resolution is now standardized across shop/dashboard/order touchpoints: `posterUrl` -> `defaultPosterId` asset -> first gallery image -> placeholder.
- Upload/API/schema updates now cover product media types and constraints, including optional gallery limits and explicit product video handling.

## Repository Structure

```text
art therapy app/
|-- client/
|   |-- src/
|   |-- .env.example
|   `-- package.json
|-- server/
|   |-- prisma/
|   |-- src/
|   |-- .env.example
|   `-- package.json
|-- docs/
|-- docker-compose.yml
`-- README.md
```

## Prerequisites

- Node.js 20+
- npm 10+
- Docker Desktop (for PostgreSQL + Redis)

## Quick Start (Local)

1. Start infrastructure:

```bash
docker-compose up -d
```

2. Backend setup and run:

```bash
cd server
npm install
copy .env.example .env
npm run db:migrate
npm run db:seed
npm run dev
```

Backend default URL: `http://localhost:3001`

Health check: `GET /health`

3. Frontend setup and run:

```bash
cd client
npm install
copy .env.example .env
npm run dev
```

Frontend default URL: `http://localhost:5173`

## Environment Configuration

Use these templates:

- `server/.env.example`
- `client/.env.example`

Important server groups:

- `DATABASE_URL`, `REDIS_URL`
- JWT secrets and expiry settings
- SMTP mail settings
- Cloudinary upload settings
- Stripe settings
- Alipay/WeChat settings
- Payment feature toggles (`PAYMENTS_ENABLED`, `ALIPAY_WECHAT_ENABLED`)
- Exchange-rate API settings

Important client vars:

- `VITE_API_URL`
- `VITE_STRIPE_PUBLISHABLE_KEY`
- `VITE_PAYMENTS_ENABLED`
- `VITE_ALIPAY_WECHAT_ENABLED`

## Scripts

Server (`server/package.json`):

- `npm run dev` - run API in watch mode
- `npm run build` - bundle to `dist/`
- `npm run typecheck` - TypeScript check
- `npm run start` - run bundled server
- `npm run db:migrate` - Prisma migrate
- `npm run db:generate` - Prisma client generate
- `npm run db:seed` - seed data
- `npm run db:backfill:therapy-plan-review-meta` - backfill missing therapy-plan review/publish timestamps
- `npm run db:backfill:product-review-meta` - backfill missing product review timestamps
- `npm run db:backfill:personal-consult-window` - normalize personal-consult schedule window fields
- `npm run db:backfill:all` - run all active backfill consistency scripts
- `npm run db:studio` - Prisma Studio

Client (`client/package.json`):

- `npm run dev` - start Vite dev server
- `npm run build` - typecheck + production build
- `npm run preview` - preview build
- `npm run lint` - lint source

## API, Realtime, and Webhooks

Base API prefix: `/api/v1`

High-level modules include:

- auth, profile, member/admin review
- therapy plans and templates
- appointments and forms
- products, cart, orders
- follows and messages
- payments (`/payments`, `/alipay`, `/wechat`)
- uploads and FX proxy

Realtime:

- Socket.IO server on same backend host
- JWT-authenticated handshake
- user room pattern: `user:<userId>`

Webhook endpoints:

- `/webhooks/stripe`
- `/webhooks/alipay`
- `/webhooks/wechat`

## Additional Documentation

See `docs/` for detailed guides:

- `docs/manual-client.md`
- `docs/manual-therapist.md`
- `docs/manual-admin.md`
- `docs/deploy-linux-aliyun.md`
- `docs/test-schedule.md`
- `docs/terms-of-service.md`
- `docs/terms-of-service-zh.md`

## Notes

- For production, rotate all secrets and use managed credentials.
- Configure webhook URLs to publicly reachable HTTPS endpoints.
- If payment providers are not configured, keep payment flags disabled for demo environments.
