import cron from 'node-cron';
import { prisma } from '../lib/prisma';
import { stripe } from '../lib/stripe';
import { sendAppointmentReminder } from './email.service';

export const startScheduledJobs = () => {
  // Every hour: send 24-hour reminders
  cron.schedule('0 * * * *', async () => {
    try {
      const in24h = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const window = new Date(in24h.getTime() + 60 * 60 * 1000);

      const upcoming = await prisma.appointment.findMany({
        where: {
          status: 'CONFIRMED',
          startTime: { gte: in24h, lt: window },
        },
        include: {
          client: true,
          therapist: { include: { user: true } },
        },
      });

      for (const appt of upcoming) {
        await sendAppointmentReminder({
          clientName: `${appt.client.firstName} ${appt.client.lastName}`,
          clientEmail: appt.client.email,
          therapistName: `${appt.therapist.user.firstName} ${appt.therapist.user.lastName}`,
          therapistEmail: appt.therapist.user.email,
          date: appt.startTime.toLocaleDateString(),
          time: appt.startTime.toLocaleTimeString(),
          medium: appt.medium,
        });
      }
    } catch (err) {
      console.error('[Scheduler] reminder job error:', err);
    }
  });

  // Every night at midnight: mark past CONFIRMED → COMPLETED
  cron.schedule('0 0 * * *', async () => {
    try {
      await prisma.appointment.updateMany({
        where: { status: 'CONFIRMED', endTime: { lt: new Date() } },
        data: { status: 'COMPLETED' },
      });
    } catch (err) {
      console.error('[Scheduler] completion job error:', err);
    }
  });

  // Every 30 minutes: cancel stale PENDING payments
  cron.schedule('*/30 * * * *', async () => {
    try {
      const cutoff = new Date(Date.now() - 30 * 60 * 1000);
      const stale = await prisma.payment.findMany({
        where: { status: 'PENDING', createdAt: { lt: cutoff } },
      });

      for (const payment of stale) {
        try {
          await stripe.paymentIntents.cancel(payment.stripePaymentIntentId);
        } catch {
          // PI may already be cancelled by Stripe
        }
        await prisma.$transaction([
          prisma.payment.update({
            where: { id: payment.id },
            data: { status: 'CANCELLED' },
          }),
          prisma.appointment.update({
            where: { id: payment.appointmentId },
            data: { status: 'CANCELLED' },
          }),
        ]);
      }
    } catch (err) {
      console.error('[Scheduler] stale cleanup job error:', err);
    }
  });

  console.log('[Scheduler] All cron jobs started');
};
