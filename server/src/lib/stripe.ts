import Stripe from 'stripe';

const paymentsEnabled = process.env.PAYMENTS_ENABLED !== 'false';

if (paymentsEnabled && !process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY environment variable is not set');
}

export const stripe = paymentsEnabled
  ? new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2023-10-16',
      typescript: true,
    })
  : (null as unknown as Stripe);

export const PLATFORM_FEE_PERCENT = Number(process.env.STRIPE_PLATFORM_FEE_PERCENT ?? 15);
