import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { stripe } from '../../lib/stripe';
import * as stripeService from '../../services/stripe.service';
import { getPrimaryClientUrl } from '../../lib/clientOrigins';

export const createPaymentIntent = async (req: Request, res: Response) => {
  try {
    const result = await stripeService.createPaymentIntent(
      req.body.appointmentId,
      req.user!.id
    );
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const getConnectStatus = async (req: Request, res: Response) => {
  try {
    const profile = await prisma.userProfile.findUnique({ where: { userId: req.user!.id } });
    if (!profile) return res.status(404).json({ message: 'Profile not found' });
    const status = await stripeService.getConnectStatus(profile.id);
    res.json(status);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const startConnectOnboarding = async (req: Request, res: Response) => {
  try {
    const profile = await prisma.userProfile.findUnique({ where: { userId: req.user!.id } });
    if (!profile) return res.status(404).json({ message: 'Profile not found' });
    const url = await stripeService.startConnectOnboarding(profile.id, req.user!.email);
    res.json({ url });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const connectReturn = async (req: Request, res: Response) => {
  // Stripe redirects here after onboarding. Sync status and redirect to client dashboard.
  const clientUrl = getPrimaryClientUrl();
  res.redirect(`${clientUrl}/dashboard/member`);
};

export const connectRefresh = async (req: Request, res: Response) => {
  // Stripe redirects here when onboarding link expires. Re-generate and redirect.
  const clientUrl = getPrimaryClientUrl();
  res.redirect(`${clientUrl}/dashboard/member?reconnect=1`);
};

export const getPaymentByAppointment = async (req: Request, res: Response) => {
  const payment = await prisma.payment.findUnique({
    where: { appointmentId: req.params.id },
    include: { appointment: true },
  });
  if (!payment) return res.status(404).json({ message: 'Payment not found' });
  res.json(payment);
};

export const getAdminStats = async (req: Request, res: Response) => {
  const { from, to } = req.query as { from?: string; to?: string };
  const dateFilter = {
    ...(from ? { gte: new Date(from) } : {}),
    ...(to ? { lte: new Date(to) } : {}),
  };

  const hasDate = from || to;

  const [payments, refunds] = await Promise.all([
    prisma.payment.findMany({
      where: {
        status: 'SUCCEEDED',
        ...(hasDate ? { createdAt: dateFilter } : {}),
      },
      select: { amount: true, platformFeeAmount: true, therapistPayoutAmount: true },
    }),
    prisma.payment.findMany({
      where: {
        status: 'REFUNDED',
        ...(hasDate ? { createdAt: dateFilter } : {}),
      },
      select: { refundAmount: true },
    }),
  ]);

  const totalGrossRevenue = payments.reduce((s, p) => s + p.amount, 0);
  const totalPlatformFees = payments.reduce((s, p) => s + p.platformFeeAmount, 0);
  const totalTherapistPayouts = payments.reduce((s, p) => s + p.therapistPayoutAmount, 0);
  const totalRefunds = refunds.reduce((s, r) => s + (r.refundAmount ?? 0), 0);

  res.json({
    totalGrossRevenue,
    totalPlatformFees,
    totalTherapistPayouts,
    totalRefunds,
    paymentCount: payments.length,
    refundCount: refunds.length,
    periodStart: from ?? null,
    periodEnd: to ?? null,
  });
};

