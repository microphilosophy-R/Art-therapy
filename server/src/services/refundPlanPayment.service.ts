import { prisma } from '../lib/prisma';

/**
 * Issue a refund for a PlanPayment linked to a TherapyPlanParticipant.
 *
 * @param participantId - TherapyPlanParticipant.id
 * @param cancelledByTherapist - true = always full refund; false = full refund only (policy expansion TBD)
 */
export const refundPlanPayment = async (
  participantId: string,
  cancelledByTherapist = false,
): Promise<{ refunded: boolean; reason?: string }> => {
  const payment = await prisma.planPayment.findUnique({
    where: { participantId },
  });

  if (!payment) return { refunded: false, reason: 'No payment record found' };
  if (payment.status !== 'SUCCEEDED') return { refunded: false, reason: 'Payment not yet succeeded' };

  // For now: always full refund (future: apply refund policy)
  // TODO: integrate with Alipay/WeChat/Stripe refund APIs
  await prisma.planPayment.update({
    where: { id: payment.id },
    data: {
      status: 'REFUNDED',
      refundedAt: new Date(),
      refundAmount: payment.amount,
    },
  });

  return { refunded: true };
};
