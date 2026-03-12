import { prisma } from '../lib/prisma';
import { refundAlipayOrder } from './alipay.service';
import { refundWechatOrder } from './wechat.service';

/**
 * Issue a refund for a PlanPayment linked to a TherapyPlanParticipant.
 *
 * @param participantId - TherapyPlanParticipant.id
 * @param cancelledByTherapist - true = always full refund; false = full refund only (policy expansion TBD)
 */
export const refundPlanPayment = async (
  participantId: string,
  cancelledByTherapist = false,
): Promise<{ refunded: boolean; reason?: string; refundAmount?: number }> => {
  const participant = await prisma.therapyPlanParticipant.findUnique({
    where: { id: participantId },
    include: { plan: { select: { startTime: true } }, payment: true },
  });

  if (!participant?.payment) return { refunded: false, reason: 'No payment record found' };
  const payment = participant.payment;
  if (payment.status !== 'SUCCEEDED') return { refunded: false, reason: 'Payment not yet succeeded' };

  // Calculate refund percentage based on time before plan start
  const hoursUntilStart = (participant.plan.startTime.getTime() - Date.now()) / 3600000;
  let refundPercent = 1.0;

  if (!cancelledByTherapist) {
    if (hoursUntilStart < 0) refundPercent = 0;
    else if (hoursUntilStart < 24) refundPercent = 0.5;
  }

  const refundAmount = Math.round(payment.amount * refundPercent);

  // Call payment provider refund API if refund amount > 0
  if (refundAmount > 0) {
    if (payment.provider === 'ALIPAY') {
      const result = await refundAlipayOrder(
        payment.externalOrderId!,
        refundAmount,
        cancelledByTherapist ? 'Therapist cancelled plan' : 'User cancellation'
      );
      if (!result.success) {
        return { refunded: false, reason: result.error };
      }
    } else if (payment.provider === 'WECHAT_PAY') {
      const result = await refundWechatOrder(
        payment.externalOrderId!,
        payment.amount,
        refundAmount,
        cancelledByTherapist ? 'Therapist cancelled plan' : 'User cancellation'
      );
      if (!result.success) {
        return { refunded: false, reason: result.error };
      }
    }
  }

  await prisma.planPayment.update({
    where: { id: payment.id },
    data: {
      status: 'REFUNDED',
      refundedAt: new Date(),
      refundAmount,
    },
  });

  return { refunded: true, refundAmount };
};
