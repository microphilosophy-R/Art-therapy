# Order Lifecycle Implementation - Deployment Guide

## Summary

Complete cart and order lifecycle system with:
- Cart validation before checkout
- Auto-cancel unpaid orders after 24 hours
- Seller notifications for order events
- Manual delivery confirmation
- Refund workflow with seller approval
- Auto-confirm delivery after 7 days

## Database Migration Required

Run on your server:
```bash
cd ~/art-therapy/server
npx prisma migrate dev --name order_lifecycle
npx prisma generate
```

## Backend Changes Complete

### New Files Created:
1. `server/src/services/cart-validation.service.ts`
2. `server/src/services/order-notification.service.ts`
3. `server/src/jobs/order-cleanup.job.ts`
4. `server/src/jobs/auto-delivery.job.ts`
5. `server/src/controllers/shop/refund.controller.ts`
6. `server/src/routes/shop/refund.routes.ts`

### Modified Files:
1. `server/prisma/schema.prisma` - Added order lifecycle fields
2. `server/src/controllers/shop/order.controller.ts` - Added validation & delivery confirmation
3. `server/src/routes/shop/order.routes.ts` - Added delivery confirmation route
4. `server/src/services/scheduler.service.ts` - Added cron jobs
5. `server/src/services/alipay.service.ts` - Added notifications
6. `server/src/services/wechat.service.ts` - Added notifications
7. `server/src/app.ts` - Registered refund router

## New API Endpoints

### Buyer Endpoints:
- `POST /api/v1/orders/:id/confirm-delivery` - Confirm order delivered
- `POST /api/v1/orders/:id/request-refund` - Request refund

### Seller Endpoints:
- `POST /api/v1/seller/orders/:id/approve-refund` - Approve refund
- `POST /api/v1/seller/orders/:id/reject-refund` - Reject refund

## Environment Variables

No new environment variables needed. Uses existing payment provider configs.

## Deployment Steps

1. Commit and push changes:
```bash
git add .
git commit -m "Implement complete order lifecycle with notifications and refunds"
git push origin main
```

2. On server, pull and migrate:
```bash
cd ~/art-therapy
git pull origin main
cd server
npm ci --omit=dev
npx prisma generate
npx prisma migrate deploy
npm run build
pm2 restart art-therapy-api
```

3. Frontend updates still needed (Phase 9-10 from plan)

## Testing Checklist

- [ ] Create order and verify seller receives notification
- [ ] Pay for order and verify payment notification
- [ ] Mark order as shipped and verify buyer notification
- [ ] Confirm delivery manually
- [ ] Request refund and verify seller notification
- [ ] Approve refund and verify stock restored
- [ ] Create unpaid order and wait 24h (or trigger cron manually)
- [ ] Ship order and wait 7 days (or trigger cron manually)

## Frontend TODO

Still need to implement:
- Delivery confirmation button in MyOrdersPage
- Refund request UI in MyOrdersPage
- Refund approval UI in ArtistOrdersTab

Backend is complete and ready for deployment!
