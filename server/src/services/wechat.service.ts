import { prisma } from '../lib/prisma';
import { wechatpay } from '../lib/wechat';
import { sendAppointmentConfirmation } from './email.service';

const PLATFORM_FEE_PERCENT = Number(process.env.STRIPE_PLATFORM_FEE_PERCENT ?? 15);

function generateOrderId(): string {
  return `AT${Date.now()}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
}

async function getValidatedAppointment(appointmentId: string, userId: string) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      therapist: { include: { user: true } },
      client: true,
      payment: true,
    },
  });

  if (!appointment) throw new Error('Appointment not found');
  if (appointment.clientId !== userId) throw new Error('Forbidden');
  if (appointment.status !== 'PENDING') throw new Error('Appointment is not in PENDING status');
  if (appointment.payment) throw new Error('Payment record already exists for this appointment');

  return appointment;
}

export const createWechatOrder = async (appointmentId: string, userId: string) => {
  const appointment = await getValidatedAppointment(appointmentId, userId);

  const totalCents = Math.round(Number(appointment.therapist.sessionPrice) * 100);
  const platformFee = Math.round(totalCents * PLATFORM_FEE_PERCENT / 100);
  const therapistPayout = totalCents - platformFee;
  const totalFen = totalCents;

  const outTradeNo = generateOrderId();
  const notifyUrl = process.env.WECHAT_NOTIFY_URL || 'http://localhost:3001/webhooks/wechat';
  const description = `Art therapy session with ${appointment.therapist.user.firstName}`;

  const response = await wechatpay!.v3.pay.transactions.native.post({
    mchid: process.env.WECHAT_MCH_ID!,
    appid: process.env.WECHAT_APP_ID!,
    description,
    out_trade_no: outTradeNo,
    notify_url: notifyUrl,
    amount: { total: totalFen, currency: 'CNY' },
  });
  const codeUrl = (response.data as any).code_url as string;

  const payment = await prisma.payment.create({
    data: {
      appointmentId,
      provider: 'WECHAT_PAY',
      externalOrderId: outTradeNo,
      amount: totalCents,
      currency: 'cny',
      platformFeeAmount: platformFee,
      therapistPayoutAmount: therapistPayout,
    },
  });

  return { codeUrl, paymentId: payment.id };
};

export const createPlanWechatOrder = async (participantId: string, userId: string) => {
  const participant = await prisma.therapyPlanParticipant.findUnique({
    where: { id: participantId },
    include: {
      plan: true,
      payment: true,
    },
  });

  if (!participant) throw new Error('Participant record not found');
  if (participant.userId !== userId) throw new Error('Forbidden');
  if (!participant.payment) throw new Error('Payment record not found for this participant');
  if (participant.payment.status === 'SUCCEEDED') throw new Error('Payment already completed');

  const totalFen = participant.payment.amount;
  const outTradeNo = generateOrderId();
  const notifyUrl = process.env.WECHAT_NOTIFY_URL || 'http://localhost:3001/webhooks/wechat';
  const description = `Therapy Plan: ${participant.plan.title}`;

  const response = await wechatpay!.v3.pay.transactions.native.post({
    mchid: process.env.WECHAT_MCH_ID!,
    appid: process.env.WECHAT_APP_ID!,
    description,
    out_trade_no: outTradeNo,
    notify_url: notifyUrl,
    amount: { total: totalFen, currency: 'CNY' },
  });
  const codeUrl = (response.data as any).code_url as string;

  await prisma.planPayment.update({
    where: { id: participant.payment.id },
    data: { externalOrderId: outTradeNo },
  });

  return { codeUrl, paymentId: participant.payment.id };
};

export const handleWechatNotification = async (
  decryptedBody: Record<string, any>
) => {
  const { out_trade_no, transaction_id, trade_state } = decryptedBody;

  if (trade_state !== 'SUCCESS') return; // not yet paid

  const payment = await prisma.payment.findFirst({
    where: { externalOrderId: out_trade_no },
    include: {
      appointment: {
        include: {
          client: true,
          therapist: { include: { user: true } },
        },
      },
    },
  });

  if (payment) {
    if (payment.status === 'SUCCEEDED') return;
    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'SUCCEEDED', externalTradeNo: transaction_id },
      }),
      prisma.appointment.update({
        where: { id: payment.appointmentId },
        data: { status: 'CONFIRMED' },
      }),
    ]);

    const { appointment } = payment;
    await sendAppointmentConfirmation({
      clientName: `${appointment.client.firstName} ${appointment.client.lastName}`,
      clientEmail: appointment.client.email,
      therapistName: `${appointment.therapist.user.firstName} ${appointment.therapist.user.lastName}`,
      therapistEmail: appointment.therapist.user.email,
      date: appointment.startTime.toDateString(),
      time: appointment.startTime.toTimeString().slice(0, 5),
      medium: appointment.medium,
      amount: `¥${(payment.amount / 100).toFixed(2)}`,
    }).catch(() => { });
    return;
  }

  // If not found in appointment payments, check therapy plan payments
  const planPayment = await prisma.planPayment.findFirst({
    where: { externalOrderId: out_trade_no },
  });

  if (planPayment) {
    if (planPayment.status === 'SUCCEEDED') return;
    await prisma.$transaction([
      prisma.planPayment.update({
        where: { id: planPayment.id },
        data: { status: 'SUCCEEDED', externalTradeNo: transaction_id },
      }),
      prisma.therapyPlanParticipant.update({
        where: { id: planPayment.participantId },
        data: { status: 'SIGNED_UP' as any },
      }),
    ]);
    return;
  }

  throw new Error('Payment record not found');
};
