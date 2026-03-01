import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import https from 'https';
import path from 'path';
import fs from 'fs';

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
import { therapyPlanRouter } from './routes/therapyPlan.routes';
import { therapyPlanTemplateRouter } from './routes/therapyPlanTemplate.routes';
import { messageRouter } from './routes/message.routes';
import { uploadRouter } from './routes/upload.routes';
import { artistRouter } from './routes/artist.routes';
import { productRouter } from './routes/product.routes';
import { cartRouter } from './routes/cart.routes';
import { orderRouter } from './routes/order.routes';
import { rateLimiter } from './middleware/rateLimiter';

const app = express();

// Security headers
app.use(helmet({ crossOriginResourcePolicy: false }));

// CORS — allow client origin
app.use(
  cors({
    origin: process.env.CLIENT_URL ?? 'http://localhost:5173',
    credentials: true,
  })
);

// Serve local uploads in development
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

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
api.use('/therapy-plans', therapyPlanRouter);
api.use('/therapy-plan-templates', therapyPlanTemplateRouter);
api.use('/messages', messageRouter);
api.use('/upload', uploadRouter);
api.use('/artists', artistRouter);
api.use('/products', productRouter);
api.use('/cart', cartRouter);
api.use('/orders', orderRouter);

// Exchange rate proxy — avoids CORS issues calling cn.apihz.cn from the browser
// Uses APIHZ_ID / APIHZ_KEY env vars; falls back to the shared public demo key (rate-limited).
api.get('/fx', (req, res) => {
  const { from = 'CNY', to = 'USD', money = '1' } = req.query as Record<string, string>;
  const id = process.env.APIHZ_ID ?? '88888888';
  const key = process.env.APIHZ_KEY ?? '88888888';
  const url = `https://cn.apihz.cn/api/jinrong/huilv.php?id=${id}&key=${key}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&money=${encodeURIComponent(money)}`;
  https.get(url, (upstream) => {
    let body = '';
    upstream.on('data', (chunk: Buffer) => { body += chunk.toString(); });
    upstream.on('end', () => {
      try {
        res.json(JSON.parse(body));
      } catch {
        res.status(502).json({ code: 502, msg: 'Bad upstream response' });
      }
    });
  }).on('error', () => {
    res.status(502).json({ code: 502, msg: 'Exchange rate fetch failed' });
  });
});

app.use('/api/v1', api);

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// 404 handler
app.use((_req, res) => res.status(404).json({ message: 'Route not found' }));

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  try {
    const logMsg = `[GlobalError] ${new Date().toISOString()} - ${err.message || err}\nStack: ${err.stack}\n`;
    fs.appendFileSync(path.join(process.cwd(), 'debug.log'), logMsg);
  } catch { }
  console.error('[Error]', err);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

export default app;
