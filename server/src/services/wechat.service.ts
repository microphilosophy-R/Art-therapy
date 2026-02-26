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
  // WeChat Pay uses fen (1 yuan = 100 fen), same as our cent representation
  const totalFen = totalCents;

  const outTradeNo = generateOrderId();
  const notifyUrl = process.env.WECHAT_NOTIFY_URL ?? 'http://localhost:3001/webhooks/wechat';
  const description = `Art therapy session with ${appointment.therapist.user.firstName}`;

  const { data } = await wechatpay!.v3.pay.transactions.native.post({
    mchid: process.env.WECHAT_MCH_ID!,
    appid: process.env.WECHAT_APP_ID!,
    description,
    out_trade_no: outTradeNo,
    notify_url: notifyUrl,
    amount: { total: totalFen, currency: 'CNY' },
  });

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

  return { codeUrl: data.code_url, paymentId: payment.id };
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

  if (!payment) throw new Error('Payment record not found');
  if (payment.status === 'SUCCEEDED') return; // idempotent

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
  }).catch(() => {}); // non-blocking
};
