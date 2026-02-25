import { prisma } from '../lib/prisma';
import { stripe } from '../lib/stripe';

export const processAppointmentRefund = async (
  appointmentId: string,
  cancelledByTherapist = false
) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      payment: true,
      therapist: { include: { refundPolicy: true } },
    },
  });

  if (!appointment?.payment) return null;
  if (appointment.payment.status !== 'SUCCEEDED') return null;
  if (!appointment.payment.stripeChargeId) return null;

  const hoursUntil =
    (new Date(appointment.startTime).getTime() - Date.now()) / (1000 * 60 * 60);

  const policy = appointment.therapist.refundPolicy;
  const threshold = policy?.fullRefundHoursThreshold ?? 24;

  let refundAmount: number | undefined;

  if (cancelledByTherapist || hoursUntil >= threshold) {
    // Full refund
    refundAmount = undefined; // undefined = full amount in Stripe API
  } else if (policy?.allowPartialRefund && policy.partialRefundPercent) {
    refundAmount = Math.round(appointment.payment.amount * policy.partialRefundPercent / 100);
  } else {
    // No refund
    return { refunded: false, reason: 'Outside refund window per cancellation policy' };
  }

  const refund = await stripe.refunds.create({
    charge: appointment.payment.stripeChargeId,
    ...(refundAmount !== undefined ? { amount: refundAmount } : {}),
  });

  await prisma.payment.update({
    where: { id: appointment.payment.id },
    data: {
      stripeRefundId: refund.id,
      refundAmount: refund.amount,
      refundedAt: new Date(),
      status: 'REFUNDED',
    },
  });

  return { refunded: true, refundId: refund.id, amount: refund.amount };
};
