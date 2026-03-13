# TODO - Refund Workflow Follow-up

## Current status snapshot
- Shop order refund backend exists:
  - Buyer request: `POST /api/v1/orders/:id/request-refund`
  - Seller approve: `POST /api/v1/seller/orders/:id/approve-refund`
  - Seller reject: `POST /api/v1/seller/orders/:id/reject-refund`
- Appointment refund backend exists with policy logic (full/partial/none), but currently Stripe-driven.
- Therapy plan refund backend exists with time-based logic (100% / 50% / 0% depending on cancellation timing).

## Pending development tasks
- [ ] Wire **shop refund request UI** in buyer orders page (`MyOrdersPage`).
- [ ] Wire **shop refund approve/reject UI** in seller orders page (`ArtistOrdersTab`).
- [ ] Add API functions in client layer for request/approve/reject refund endpoints.
- [ ] Fix Alipay refund call in shop approve flow (argument mismatch risk in refund controller vs service signature).
- [ ] Verify appointment refund supports non-Stripe providers (Alipay/WeChat) or explicitly restrict with clear errors.
- [ ] Add end-to-end tests for:
  - request refund -> seller notification
  - approve refund -> payment status update + order cancelled + stock restored
  - reject refund -> rejection reason stored + buyer notification
  - appointment policy edge cases (before threshold / within threshold / after start)
  - therapy plan cancellation refund percentages

## Notes for next iteration
- Keep provider behavior consistent across Shop / Appointment / Plan flows.
- Ensure idempotency (avoid double refund on repeated action/retry).
- Add admin-facing visibility for refund lifecycle states and failures.
