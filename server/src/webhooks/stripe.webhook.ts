import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { stripe } from '../lib/stripe';
import { prisma } from '../lib/prisma';
import { sendAppointmentConfirmation } from '../services/email.service';

export const stripeWebhookRouter = Router();

stripeWebhookRouter.post(
  '/stripe',
  // express.raw() is applied at the app level for this router
  async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'];
    if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
      return res.status(400).json({ message: 'Missing signature' });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err: any) {
      console.error('[Webhook] signature verification failed:', err.message);
      return res.status(400).json({ message: `Webhook error: ${err.message}` });
    }

    // Idempotency check
    const existing = await prisma.webhookEvent.findUnique({ where: { id: event.id } });
    if (existing?.processed) {
      return res.json({ received: true });
    }

    // Upsert event record
    await prisma.webhookEvent.upsert({
      where: { id: event.id },
      create: { id: event.id, type: event.type, rawPayload: event as any },
      update: {},
    });

    try {
      await handleEvent(event);
      await prisma.webhookEvent.update({
        where: { id: event.id },
        data: { processed: true, processedAt: new Date() },
      });
    } catch (err) {
      console.error(`[Webhook] handler error for ${event.type}:`, err);
      // Return 200 to prevent Stripe from retrying — log the failure for manual review
    }

    res.json({ received: true });
  }
);

async function handleEvent(event: Stripe.Event) {
  switch (event.type) {
    case 'payment_intent.succeeded': {
      const pi = event.data.object as Stripe.PaymentIntent;
      const appointmentId = pi.metadata?.appointmentId;
      if (!appointmentId) break;

      const chargeId = pi.latest_charge as string | null;

      const [payment] = await prisma.$transaction([
        prisma.payment.update({
          where: { stripePaymentIntentId: pi.id },
          data: {
            status: 'SUCCEEDED',
            stripeChargeId: chargeId ?? undefined,
          },
        }),
        prisma.appointment.update({
          where: { id: appointmentId },
          data: { status: 'CONFIRMED' },
        }),
      ]);

      // Send confirmation emails
      const appt = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: { client: true, therapist: { include: { user: true } } },
      });
      if (appt) {
        await sendAppointmentConfirmation({
          clientName: `${appt.client.firstName} ${appt.client.lastName}`,
          clientEmail: appt.client.email,
          therapistName: `${appt.therapist.user.firstName} ${appt.therapist.user.lastName}`,
          therapistEmail: appt.therapist.user.email,
          date: appt.startTime.toLocaleDateString(),
          time: appt.startTime.toLocaleTimeString(),
          medium: appt.medium,
          amount: `$${(payment.amount / 100).toFixed(2)}`,
        }).catch(console.error);
      }
      break;
    }

    case 'payment_intent.payment_failed': {
      const pi = event.data.object as Stripe.PaymentIntent;
      await prisma.payment.updateMany({
        where: { stripePaymentIntentId: pi.id },
        data: { status: 'FAILED' },
      });
      break;
    }

    case 'payment_intent.canceled': {
      const pi = event.data.object as Stripe.PaymentIntent;
      const payment = await prisma.payment.findUnique({
        where: { stripePaymentIntentId: pi.id },
      });
      if (payment) {
        await prisma.$transaction([
          prisma.payment.update({ where: { id: payment.id }, data: { status: 'CANCELLED' } }),
          prisma.appointment.update({
            where: { id: payment.appointmentId },
            data: { status: 'CANCELLED' },
          }),
        ]);
      }
      break;
    }

    case 'charge.refunded': {
      const charge = event.data.object as Stripe.Charge;
      await prisma.payment.updateMany({
        where: { stripeChargeId: charge.id },
        data: { status: 'REFUNDED', refundedAt: new Date() },
      });
      break;
    }

    case 'account.updated': {
      const account = event.data.object as Stripe.Account;
      let status: 'ACTIVE' | 'RESTRICTED' | 'ONBOARDING_IN_PROGRESS' | 'DISABLED';
      if (account.charges_enabled) {
        status = 'ACTIVE';
      } else if (account.requirements?.disabled_reason) {
        status = 'DISABLED';
      } else if (
        account.requirements?.eventually_due?.length ||
        account.requirements?.currently_due?.length
      ) {
        status = 'ONBOARDING_IN_PROGRESS';
      } else {
        status = 'RESTRICTED';
      }

      await prisma.therapistProfile.updateMany({
        where: { stripeAccountId: account.id },
        data: { stripeAccountStatus: status },
      });
      break;
    }

    default:
      console.log(`[Webhook] unhandled event type: ${event.type}`);
  }
}
