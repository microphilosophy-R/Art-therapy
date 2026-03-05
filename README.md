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

Capabilities are enforced by backend middleware (`authorize(...)` + `requireCertificate(...)`).

## Key Features

- Public therapist directory and profile pages
- Appointment booking and payment
- Therapy plan creation workflow (therapist certificate required)
- Product creation and fulfillment workflow (artificer certificate required)
- Cart, checkout, orders, and payment webhook processing
- Member follow system (`MEMBER` <-> `MEMBER` only)
- Direct chat with Socket.IO real-time updates
- Chat guardrail: one consecutive message max until the other side replies
- Bilingual content support (`zh`/`en`) for plans and products

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
