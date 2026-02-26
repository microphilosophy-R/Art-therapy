import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import { stripeWebhookRouter } from './webhooks/stripe.webhook';
import { alipayWebhookRouter } from './webhooks/alipay.webhook';
import { wechatWebhookRouter } from './webhooks/wechat.webhook';
import { authRouter } from './routes/auth.routes';
import { therapistRouter } from './routes/therapist.routes';
import { appointmentRouter } from './routes/appointment.routes';
import { paymentRouter } from './routes/payment.routes';
import { alipayRouter } from './routes/alipay.routes';
import { wechatRouter } from './routes/wechat.routes';
import { adminRouter } from './routes/admin.routes';
import { profileRouter } from './routes/profile.routes';
import { formRouter } from './routes/form.routes';
import { rateLimiter } from './middleware/rateLimiter';

const app = express();

// Security headers
app.use(helmet());

// CORS — allow client origin
app.use(
  cors({
    origin: process.env.CLIENT_URL ?? 'http://localhost:5173',
    credentials: true,
  })
);

// ⚠️ Webhook routes MUST be mounted before express.json()
// Stripe and WeChat webhooks require raw Buffer body; Alipay requires urlencoded
app.use('/webhooks/stripe', express.raw({ type: 'application/json' }), stripeWebhookRouter);
app.use('/webhooks/alipay', express.urlencoded({ extended: false }), alipayWebhookRouter);
app.use('/webhooks/wechat', express.raw({ type: 'application/json' }), wechatWebhookRouter);

// Body parsers for all other routes
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// Rate limiting
app.use('/api', rateLimiter(100, 60));

// API routes
const api = express.Router();
api.use('/auth', authRouter);
api.use('/therapists', therapistRouter);
api.use('/appointments', appointmentRouter);
api.use('/payments', paymentRouter);
api.use('/alipay', alipayRouter);
api.use('/wechat', wechatRouter);
api.use('/admin', adminRouter);
api.use('/profile', profileRouter);
api.use('/forms', formRouter);

app.use('/api/v1', api);

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// 404 handler
app.use((_req, res) => res.status(404).json({ message: 'Route not found' }));

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Error]', err);
  res.status(500).json({ message: 'Internal server error' });
});

export default app;
