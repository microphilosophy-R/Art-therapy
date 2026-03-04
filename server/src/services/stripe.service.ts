import { stripe, PLATFORM_FEE_PERCENT } from '../lib/stripe';
import { prisma } from '../lib/prisma';

export const createPaymentIntent = async (appointmentId: string, userId: string) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      userProfile: { include: { refundPolicy: true } },
      client: true,
      payment: true,
    },
  });

  if (!appointment) throw new Error('Appointment not found');
  if (appointment.clientId !== userId) throw new Error('Forbidden');
  if (appointment.status !== 'PENDING') throw new Error('Appointment is not in PENDING status');
  if (appointment.payment) throw new Error('Payment intent already exists');
  if (!appointment.userProfile) throw new Error('Provider profile not found');
  if (appointment.userProfile.stripeAccountStatus !== 'ACTIVE') {
    throw new Error('Provider Stripe account is not active');
  }
  if (!appointment.userProfile.stripeAccountId) {
    throw new Error('Provider has no Stripe account');
  }

  const totalCents = Math.round(Number(appointment.userProfile.sessionPrice ?? 0) * 100);
  const platformFee = Math.round((totalCents * PLATFORM_FEE_PERCENT) / 100);
  const providerPayout = totalCents - platformFee;

  const intent = await stripe.paymentIntents.create({
    amount: totalCents,
    currency: 'usd',
    application_fee_amount: platformFee,
    transfer_data: { destination: appointment.userProfile.stripeAccountId },
    metadata: {
      appointmentId,
      userProfileId: appointment.userProfileId,
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
      therapistPayoutAmount: providerPayout,
    },
  });

  return { clientSecret: intent.client_secret!, paymentId: payment.id };
};

export const startConnectOnboarding = async (profileId: string, email: string) => {
  let profile = await prisma.userProfile.findUnique({ where: { id: profileId } });
  if (!profile) throw new Error('Profile not found');

  let accountId = profile.stripeAccountId;
  if (!accountId) {
    const account = await stripe.accounts.create({ type: 'express', email });
    accountId = account.id;
    await prisma.userProfile.update({
      where: { id: profileId },
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

export const getConnectStatus = async (profileId: string) => {
  const profile = await prisma.userProfile.findUnique({ where: { id: profileId } });
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

