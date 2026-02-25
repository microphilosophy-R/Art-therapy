Tech Stack
Frontend
Item	Status	Notes
React 18	✅ Done	client/src/main.tsx, all page components
TypeScript	✅ Done	Full tsconfig.json, tsc --noEmit passes clean
Vite	✅ Done	vite.config.ts, dev server confirmed running
React Router v6	✅ Done	App.tsx — 13 routes with nested ProtectedRoute
TanStack Query	✅ Done	All pages use useQuery/useMutation
Zustand	✅ Done	authStore.ts — auth state + updateUser
Tailwind CSS	✅ Done	tailwind.config.ts, all components use utility classes
shadcn/ui	⚠️ Partial	Custom components built (Button, Badge, Avatar, Input, Card, Spinner, StarRating, Textarea, Select) but not sourced from the actual shadcn/ui registry — functionally equivalent, no Radix UI primitives underneath
React Hook Form + Zod	✅ Done	Used in Login, Register, BookAppointment, UserProfile, ComposeForm
FullCalendar	❌ Not built	README specifies an interactive scheduling calendar; current date picker in BookAppointment is a custom slot grid, not FullCalendar
Axios	✅ Done	api/axios.ts — interceptors for Bearer token + refresh
@stripe/stripe-js	✅ Done	lib/stripe.ts — loadStripe() singleton
@stripe/react-stripe-js	✅ Done	PaymentElementWrapper.tsx, PaymentForm.tsx
Backend
Item	Status	Notes
Node.js 20	✅ Done	package.json engines field, confirmed on v24.13.1
Express.js	✅ Done	app.ts, 7 routers mounted
TypeScript	✅ Done	server/tsconfig.json, zero type errors
Prisma ORM	✅ Done	Schema with 13 models, client generated, db push applied
PostgreSQL	✅ Done	Docker container running, all tables created and seeded
Redis	✅ Done	lib/redis.ts, used in rate limiter + token blacklist
JWT	✅ Done	Access (15m) + refresh (7d httpOnly cookie), blacklist on logout
bcrypt	✅ Done	Password hashing in auth.controller.ts, profile.controller.ts
Nodemailer	✅ Done	email.service.ts — confirmation + reminder templates
node-cron	✅ Done	scheduler.service.ts — 3 jobs (24h reminders, midnight completion, 30-min stale cleanup)
Zod	✅ Done	6 schema files covering all routes
Multer + Cloudinary	⚠️ Partial	upload.service.ts exists with Cloudinary integration, but no route exposes a file upload endpoint; no avatar or artwork upload UI exists
stripe (Node SDK)	✅ Done	lib/stripe.ts, stripe.service.ts, refund.service.ts, webhook handler
DevOps & Tooling
Item	Status	Notes
Docker + Docker Compose	✅ Done	docker-compose.yml — PostgreSQL 16 + Redis 7
ESLint + Prettier	❌ Not configured	No .eslintrc or .prettierrc in either client/ or server/
Vitest	❌ Not built	No test files exist in client/
Jest + Supertest	❌ Not built	No test files exist in server/
GitHub Actions	❌ Not built	No .github/workflows/ directory
Architecture
Item	Status	Notes
Browser → API request flow	✅ Done	Axios + Bearer token, interceptors handle 401 refresh
Webhook raw-body ordering	✅ Done	app.ts mounts /webhooks before express.json()
Middleware chain (CORS → Helmet → rate limit → auth → role → validate → controller)	✅ Done	Exact order implemented in app.ts
Database / Prisma Schema
Model	Status	Notes
User	✅ Done	Extended beyond spec: added nickname, age, gender, privacyConsentAt
TherapistProfile	✅ Done	All fields per spec
Appointment	✅ Done	All fields per spec
SessionNote	✅ Done	Defined in schema, not exposed via UI yet
Availability	✅ Done	Seeded; slot generation logic in therapist controller
Review	✅ Done	Seeded, displayed on therapist profile
Payment	✅ Done	All Stripe fields, cents-only amounts
RefundPolicy	✅ Done	Per-therapist config, shown in booking UI
WebhookEvent	✅ Done	Idempotency table, Stripe event ID as PK
ClientForm	✅ Added (beyond spec)	Form system not in original README
FormQuestion	✅ Added (beyond spec)	
FormResponse	✅ Added (beyond spec)	
FormAnswer	✅ Added (beyond spec)	
API Endpoints
Authentication
Endpoint	Status
POST /auth/register	✅ Done
POST /auth/login	✅ Done
POST /auth/logout	✅ Done
POST /auth/refresh	✅ Done
GET /auth/me	✅ Done
Profile (added beyond spec)
Endpoint	Status
GET /profile	✅ Done
PATCH /profile	✅ Done
PATCH /profile/password	✅ Done
POST /profile/privacy-consent	✅ Done
Therapists
Endpoint	Status
GET /therapists	✅ Done
GET /therapists/:id	✅ Done
GET /therapists/:id/slots	✅ Done
PUT /therapists/:id	✅ Done
PUT /therapists/:id/availability	⚠️ Route exists but no UI to set availability from therapist dashboard
Appointments
Endpoint	Status
POST /appointments	✅ Done
GET /appointments	✅ Done
GET /appointments/:id	✅ Done
PATCH /appointments/:id/status	✅ Done
DELETE /appointments/:id	✅ Done
Session Notes
Endpoint	Status
POST /appointments/:id/notes	⚠️ Defined in schema and likely in controller, but no therapist UI for writing session notes
GET /appointments/:id/notes	⚠️ Same — backend may exist, no frontend
PUT /appointments/:id/notes	⚠️ Same
Admin
Endpoint	Status
GET /admin/users	✅ Done
PATCH /admin/users/:id	✅ Done
GET /admin/stats	✅ Done
Payments
Endpoint	Status
POST /payments/create-intent	✅ Done
GET /payments/connect/status	✅ Done
POST /payments/connect/onboard	✅ Done
GET /payments/connect/return	✅ Done
GET /payments/connect/refresh	✅ Done
GET /payments/appointment/:id	✅ Done
GET /payments/admin/stats	✅ Done
Webhooks
Endpoint	Status
POST /webhooks/stripe	✅ Done — handles 5 event types with idempotency
Forms (added beyond spec)
Endpoint	Status
POST /forms	✅ Done
GET /forms/sent	✅ Done
GET /forms/received	✅ Done
GET /forms/:id (client view)	✅ Done
GET /forms/:id/detail (therapist view + responses)	✅ Done
PATCH /forms/:id/send	✅ Done
PATCH /forms/:id/archive	✅ Done
POST /forms/:id/submit	✅ Done
Frontend Pages
Route	Status	Notes
/	✅ Done	Hero, featured therapists, testimonials
/therapists	✅ Done	Search, filters, pagination
/therapists/:id	✅ Done	Profile, reviews, booking card
/book/:therapistId	✅ Done	4-step wizard with Stripe payment
/booking/confirmation	✅ Done	Polls until CONFIRMED, receipt
/login	✅ Done	
/register	✅ Done	Role selection
/profile	✅ Done (beyond spec)	4-tab settings — info, security, payment, privacy
/privacy	✅ Done (beyond spec)	Full HIPAA/APA policy, accordion, consent button
/dashboard/client	✅ Done	Upcoming/past/forms tabs, cancel, forms inbox
/dashboard/therapist	✅ Done	Stripe Connect banner, pending/upcoming/past/forms tabs
/dashboard/admin	✅ Done	Overview/Users/Appointments/Revenue 4-tab interface
/forms/new	✅ Done (beyond spec)	Compose form with 6 question types
/forms/:id	✅ Done (beyond spec)	Client fills form
/forms/:id/responses	✅ Done (beyond spec)	Therapist views responses
Summary of Gaps
These items are specified in the README but not yet implemented:

Gap	Priority	What it requires
FullCalendar	Medium	Replace slot grid in BookAppointment with FullCalendar; add calendar view to TherapistDashboard
Session Notes UI	Medium	Therapist form to write/edit notes after a completed session; backend routes likely already exist
Availability editor UI	Medium	Therapist UI to set weekly hours (day/time pickers); backend route PUT /therapists/:id/availability exists
Avatar / artwork upload	Low	Wire Multer + Cloudinary upload.service.ts to a profile photo endpoint; add file picker to UserProfile
ESLint + Prettier	Low	Config files only — no code changes needed
Vitest tests	Low	Frontend unit/component tests
Jest + Supertest tests	Low	Backend API integration tests
GitHub Actions CI	Low	.github/workflows/ci.yml — lint, type-check, test, build


1. Calender tab shall has different visual effects(highlights) on avaiable time.