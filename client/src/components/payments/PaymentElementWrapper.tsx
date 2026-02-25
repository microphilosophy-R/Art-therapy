import React from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { stripePromise } from '../../lib/stripe';
import { PaymentForm } from './PaymentForm';

interface PaymentElementWrapperProps {
  clientSecret: string;
  appointmentId: string;
  amount: number;
  onSuccess: () => void;
  onError: (msg: string) => void;
}

export const PaymentElementWrapper = ({
  clientSecret,
  appointmentId,
  amount,
  onSuccess,
  onError,
}: PaymentElementWrapperProps) => (
  <Elements
    stripe={stripePromise}
    options={{
      clientSecret,
      appearance: {
        theme: 'stripe',
        variables: {
          colorPrimary: '#0d9488',
          colorBackground: '#ffffff',
          colorText: '#1c1917',
          colorDanger: '#e11d48',
          fontFamily: 'Inter, system-ui, sans-serif',
          borderRadius: '8px',
        },
      },
    }}
  >
    <PaymentForm
      appointmentId={appointmentId}
      amount={amount}
      onSuccess={onSuccess}
      onError={onError}
    />
  </Elements>
);
