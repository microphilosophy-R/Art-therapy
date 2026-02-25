import { stripe, PLATFORM_FEE_PERCENT } from '../lib/stripe';
import { prisma } from '../lib/prisma';

export const createPaymentIntent = async (appointmentId: string, userId: string) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      therapist: { include: { refundPolicy: true } },
      client: true,
      payment: true,
    },
  });

  if (!appointment) throw new Error('Appointment not found');
  if (appointment.clientId !== userId) throw new Error('Forbidden');
  if (appointment.status !== 'PENDING') throw new Error('Appointment is not in PENDING status');
  if (appointment.payment) throw new Error('Payment intent already exists');
  if (appointment.therapist.stripeAccountStatus !== 'ACTIVE') {
    throw new Error('Therapist Stripe account is not active');
  }
  if (!appointment.therapist.stripeAccountId) {
    throw new Error('Therapist has no Stripe account');
  }

  const totalCents = Math.round(Number(appointment.therapist.sessionPrice) * 100);
  const platformFee = Math.round(totalCents * PLATFORM_FEE_PERCENT / 100);
  const therapistPayout = totalCents - platformFee;

  const intent = await stripe.paymentIntents.create({
    amount: totalCents,
    currency: 'usd',
    application_fee_amount: platformFee,
    transfer_data: { destination: appointment.therapist.stripeAccountId },
    metadata: {
      appointmentId,
      therapistId: appointment.therapistId,
      clientId: appointment.clientId,
    },
    automatic_payment_methods: { enabled: true },
  });

  const payment = await prisma.payment.create({
    data: {
      appointmentId,
      stripePaymentIntentId: intent.id,
      amount: totalCents,
      platformFeeAmount: platformFee,
      therapistPayoutAmount: therapistPayout,
    },
  });

  return { clientSecret: intent.client_secret!, paymentId: payment.id };
};

export const startConnectOnboarding = async (therapistId: string, email: string) => {
  let profile = await prisma.therapistProfile.findUnique({ where: { id: therapistId } });
  if (!profile) throw new Error('Therapist profile not found');

  let accountId = profile.stripeAccountId;
  if (!accountId) {
    const account = await stripe.accounts.create({ type: 'express', email });
    accountId = account.id;
    await prisma.therapistProfile.update({
      where: { id: therapistId },
      data: {
        stripeAccountId: accountId,
        stripeAccountStatus: 'ONBOARDING_IN_PROGRESS',
      },
    });
  }

  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: process.env.STRIPE_CONNECT_REFRESH_URL!,
    return_url: process.env.STRIPE_CONNECT_RETURN_URL!,
    type: 'account_onboarding',
  });

  return link.url;
};

export const getConnectStatus = async (therapistId: string) => {
  const profile = await prisma.therapistProfile.findUnique({ where: { id: therapistId } });
  if (!profile) throw new Error('Profile not found');

  if (!profile.stripeAccountId) {
    return { connected: false, status: 'NOT_CONNECTED', chargesEnabled: false };
  }

  const account = await stripe.accounts.retrieve(profile.stripeAccountId);
  return {
    connected: true,
    status: profile.stripeAccountStatus,
    chargesEnabled: account.charges_enabled,
  };
};
