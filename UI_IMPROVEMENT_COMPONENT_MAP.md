# UI Improvement Component Map

## Purpose and Scope
This document maps the core UI flows that changed recently and defines component-level targets for the next UI iteration. It is intentionally scoped to therapy/product editing, translation checkpoint UX, checkout address flow, admin efficiency workspace, and product cover fallback touchpoints.

## Flow Inventory (Core Changed Flows)
- Therapy Plan Editor: Multi-step authoring flow with metadata, schedule/time, translation checkpoint, and preview.
- Product Editor: Multi-step authoring flow with required poster in step 1, optional gallery/video in step 2, translation checkpoint, and preview.
- Translation Checkpoint: Side-by-side source/result editing stage used by both editor flows before final review.
- Checkout Address Flow: Member address selection/editing before order confirmation and payment.
- Admin Efficiency Workspace: Operations-focused admin area for review queue, certificate actions, and timeline (Gantt) views.
- Product Cover Consumption: Shared product cover resolution used in listing, detail, cart, checkout, orders, and dashboard views.

## Component Catalog
| Flow | Component | Location | Function | Primary Inputs/State | Current UX Pain Points | Planned UI Improvement Direction |
| --- | --- | --- | --- | --- | --- | --- |
| Shared | `WizardStepper` | `client/src/components/ui/WizardStepper.tsx` | Shared visual step progress for editor flows | `steps[]`, `currentStep`, completed/locked state | Visual rhythm varies by page container spacing; mobile compression can reduce readability | Standardize step chip spacing, typography scale, and breakpoint behavior with stricter design tokens |
| Shared | `PosterSelector` | `client/src/components/therapyPlans/PosterSelector.tsx` | Poster selection UX (default assets + custom upload entry) | selected default poster id, custom file, preview URL, validation errors | Selector density and preview affordance are weaker when container grows wider | Add stronger card hierarchy, selected state contrast, and explicit default/custom mode framing |
| Therapy Editor | `TherapyPlanForm` (step shell + orchestration) | `client/src/pages/therapy-plans/TherapyPlanForm.tsx` | Hosts step sequence, validation, upload/translation submit pipeline | `currentStep`, form values, upload states, translation states | Step content blocks still feel visually fragmented across sections | Introduce consistent step container primitives (header/body/footer) and vertical rhythm rules |
| Therapy Editor | `Step1Metadata` | `client/src/components/therapyPlans/wizard/Step1Metadata.tsx` | Collects core plan metadata and localized text entry | plan type, localized title/slogan/intro, poster, validation state | Field grouping and required markers can be scanned slowly on dense forms | Re-group fields by task intent (identity/media) and tighten label-helper alignment |
| Therapy Editor | `Step2Schedule` | `client/src/components/therapyPlans/wizard/Step2Schedule.tsx` | Schedule date/time and session setup | schedule window, time slots, recurring/one-off settings | Hour/minute entry and calendar controls compete for horizontal space | Promote a calendar-first desktop layout and compact time controls with clearer constraints |
| Therapy Editor | `Step3Imports` | `client/src/components/therapyPlans/wizard/Step3Imports.tsx` | Template/import integration before translation/preview | imported template fields, merge mode, diff state | Import provenance and overwritten fields are not always obvious | Add explicit import summary panel and conflict indicators before apply |
| Therapy Editor | `Step4Preview` | `client/src/components/therapyPlans/wizard/Step4Preview.tsx` | Final plan verification before submission | resolved localized text, poster/media, schedule summary | Preview hierarchy can under-emphasize changed fields from previous steps | Add "changed since last step" markers and stronger section anchors |
| Product Editor | `ProductWizard` (step shell + all step panels) | `client/src/pages/Dashboard/ProductWizard.tsx` | Product multi-step orchestration for basic info, media, translation, preview | `currentStep`, localized content, poster/gallery/video files, upload state, translation state | Step internals are monolithic; error context can feel distant from trigger action | Extract step sections into clearer sub-panels and keep actionable errors inline at control level |
| Product Editor | Step 1 panel inside `ProductWizard` | `client/src/pages/Dashboard/ProductWizard.tsx` | Captures title/category/price/stock/introduction + required poster choice | localized title/introduction, category, price, stock, `defaultPosterId`/custom poster | Poster requirement feedback may appear late in long forms | Move poster requirement status near step header and keep real-time completeness indicator |
| Product Editor | Step 2 media panel inside `ProductWizard` | `client/src/pages/Dashboard/ProductWizard.tsx` | Optional gallery images + optional video uploads | gallery files/URLs, video file/URL, upload progress/error | Upload progress and retry actions are not uniformly surfaced per media type | Add unified media queue UI with per-item progress, retry, and failure chips |
| Product Editor | Translation step inside `ProductWizard` | `client/src/pages/Dashboard/ProductWizard.tsx` | Side-by-side source/result editing and overwrite-on-translate action | source/target localized fields, per-field translate status, reviewed/skip flags | Left-right editing rows can feel crowded on medium-width viewports | Improve row grid breakpoints and sticky language headers for long descriptions |
| Product Editor | Preview step inside `ProductWizard` | `client/src/pages/Dashboard/ProductWizard.tsx` | Final content/media check before create/update submit | poster/video/gallery resolved URLs, localized text, stock/price summary | Primary-vs-secondary media emphasis can be inconsistent across cards vs preview | Enforce poster-as-primary preview card and standardized media order |
| Checkout | `AddressBookPanel` | `client/src/components/profile/AddressBookPanel.tsx` | CRUD management for member delivery addresses (max 6, default logic) | address list, default id, add/edit form state, validation errors | Dense form entry for province/city/district/detail may feel heavy | Add progressive disclosure and faster region picker patterns |
| Checkout | `CheckoutPage` (Step 1/2/3 flow) | `client/src/pages/shop/CheckoutPage.tsx` | Address selection/edit, order confirmation, payment step orchestration | selected address id, order draft/snapshot, payment method/state | Step transitions and summary context can be lost between address and payment | Keep persistent order summary sidebar and explicit step completion badges |
| Admin Efficiency | `AdminDashboard` | `client/src/pages/Dashboard/AdminDashboard.tsx` | Admin shell with overview tabs and operational entry points | active tab, filter/search state, overview metrics | High-information surfaces require faster switching between related tasks | Add quick-jump controls and saved filter presets for common admin routines |
| Admin Efficiency | `AdminReviewOpsTab` | `client/src/pages/Dashboard/tabs/AdminReviewOpsTab.tsx` | Review operations workspace with queue + timeline modes | queue filters, status selection, date range, timeline mode switch | Queue and timeline mental models can feel disconnected | Add linked selection: queue item highlights corresponding timeline segment |
| Admin Efficiency | `AdminReviewTab` | `client/src/pages/Dashboard/tabs/AdminReviewTab.tsx` | Certificate review actions and status handling | pending cert list, approve/reject/revoke actions | Action density may increase confirmation friction | Consolidate row actions into predictable primary/secondary action groups |
| Admin Efficiency | `AdminPlansTab` | `client/src/pages/Dashboard/tabs/AdminPlansTab.tsx` | Plan/product moderation lists and approvals | plan/product filters, status, pagination | Context switching between entities can slow review throughput | Add unified moderation table mode and shared bulk action affordances |
| Shop/Order Cover | `resolveProductCover` helpers | `client/src/utils/productMedia.ts` | Normalizes product cover fallback chain | `posterUrl`, `defaultPosterId`, `images[]`, placeholder | Consumers may render mismatched aspect-ratio/crop behaviors | Standardize aspect ratio + object-fit contract across all consuming cards |
| Shop/Order Cover | Product listing cards | `client/src/components/shop/FeaturedProductsRow.tsx`, `client/src/pages/shop/ShopPage.tsx` | Show product cover in discovery surfaces | product card data, fallback cover URL | Visual inconsistency across rows and grids when fallback source differs | Apply shared product card media frame and loading skeleton states |
| Shop/Order Cover | Detail/cart/checkout/order consumers | `client/src/pages/shop/ProductDetailsPage.tsx`, `client/src/pages/shop/CartPage.tsx`, `client/src/pages/shop/CheckoutPage.tsx`, `client/src/pages/user/MyOrdersPage.tsx` | Reuse fallback cover in transactional screens | order/cart line items, product fallback cover URL | Smaller thumbnails can hide whether cover is poster/default/gallery fallback | Add optional fallback badge in admin/debug mode and unify thumbnail sizing |
| Shop/Order Cover | Dashboard product consumers | `client/src/pages/Dashboard/tabs/ProductsTab.tsx`, `client/src/pages/Dashboard/tabs/ArtistProductsTab.tsx`, `client/src/pages/Dashboard/tabs/ShowcaseTab.tsx`, `client/src/pages/Dashboard/tabs/ShowcaseTabEnhanced.tsx` | Render authored products in creator/admin views | product localized fields, fallback cover URL | Inconsistent card density across tabs makes scan speed uneven | Introduce shared dashboard product card variants (compact/regular) |

## Interaction Contracts
- Therapy/Product Stepper Contract: `WizardStepper` receives a stable ordered step definition from each wizard shell; each step reports completion readiness so navigation state remains deterministic.
- Translation Contract: translation steps consume source-language values from current UI language fields, write translated output into target-language fields, and expose three progression signals (`manual edit`, `translate attempted`, `skip`).
- Media Upload Contract: editor step state keeps local `File` objects; upload pipeline resolves URLs before preview/submit; failed uploads must block forward progression and surface localized inline errors.
- Checkout Contract: `AddressBookPanel` provides selected `addressId` and edited address records to `CheckoutPage`; order creation snapshots the selected address into order payload before payment step.
- Admin Ops Contract: review queue and timeline views share filters/date range to keep list and Gantt projections aligned for the same operational window.
- Product Cover Contract: consuming pages call `productMedia` resolver first; UI components should never assume gallery image existence.

## UI Improvement Backlog (Prioritized)
- P0
  - Unify form section containers (header/body/footer) in therapy/product wizards for identical spacing and action placement.
  - Add per-media upload queue states (pending/uploading/success/failed) with retry controls in product step 2.
  - Improve translation step grid behavior at `md` breakpoints to prevent cramped source/result editing.
  - Preserve persistent order summary and selected-address badge through all checkout steps.
- P1
  - Add quick filters, saved views, and keyboard-first table focus flow in admin review operations.
  - Standardize product media aspect ratios and skeleton loaders across shop, dashboard, and order surfaces.
  - Improve address form ergonomics with structured region pickers and clearer default-address affordances.
- P2
  - Extract product wizard step panels into dedicated components to improve maintainability and visual iteration speed.
  - Add visual change-highlighting in preview steps for values updated by translation/import actions.
  - Add compact/regular dashboard card variants for better information density control.

## Acceptance Criteria for Next UI Iteration
- Therapy and product wizards use the same step shell spacing, equal-width stepper behavior, and button placement at desktop and mobile breakpoints.
- Product media step supports clear per-item progress and error recovery for poster/gallery/video uploads without ambiguous failure states.
- Translation checkpoint remains side-by-side and readable at common widths (`md`, `lg`, `xl`) with clear source/result labeling.
- Checkout keeps address context visible from step 1 through payment, and selected address is always obvious in confirmation.
- Admin review operations can switch queue/timeline views without losing filter/date context and with reduced click count for routine approvals.
- Product cover rendering is visually consistent across shop, dashboard, cart, checkout, and order pages even when gallery is empty.
