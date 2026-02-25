import React, { useState } from 'react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '../ui/Button';

interface PaymentFormProps {
  appointmentId: string;
  amount: number;
  onSuccess: () => void;
  onError: (msg: string) => void;
}

export const PaymentForm = ({ appointmentId, amount, onSuccess, onError }: PaymentFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/booking/confirmation?appointmentId=${appointmentId}`,
        },
        redirect: 'if_required',
      });

      if (error) {
        onError(error.message ?? 'Payment failed. Please try again.');
      } else if (paymentIntent?.status === 'succeeded') {
        onSuccess();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement
        options={{
          layout: 'tabs',
        }}
      />
      <div className="rounded-lg bg-stone-50 border border-stone-200 p-3 flex items-center gap-2 text-xs text-stone-500">
        <svg className="h-4 w-4 text-teal-600 shrink-0" viewBox="0 0 24 24" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z"
            clipRule="evenodd"
          />
        </svg>
        Your payment is secured by Stripe. We never store your card details.
      </div>
      <Button
        type="submit"
        loading={loading}
        disabled={!stripe}
        className="w-full"
        size="lg"
      >
        Pay ${(amount / 100).toFixed(2)}
      </Button>
    </form>
  );
};
