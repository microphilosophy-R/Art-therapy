import { loadStripe } from '@stripe/stripe-js';

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string;

if (!publishableKey) {
  console.warn('VITE_STRIPE_PUBLISHABLE_KEY is not set. Payment features will not work.');
}

export const stripePromise = loadStripe(publishableKey ?? '');
