import { prisma } from '../lib/prisma';
import { alipay } from '../lib/alipay';
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

export const createAlipayOrder = async (appointmentId: string, userId: string) => {
  const appointment = await getValidatedAppointment(appointmentId, userId);

  const totalCents = Math.round(Number(appointment.therapist.sessionPrice) * 100);
  const platformFee = Math.round(totalCents * PLATFORM_FEE_PERCENT / 100);
  const therapistPayout = totalCents - platformFee;
  // Alipay expects yuan with 2 decimal places
  const totalYuan = (totalCents / 100).toFixed(2);

  const outTradeNo = generateOrderId();
  const returnUrl = process.env.ALIPAY_RETURN_URL ?? 'http://localhost:5173/booking/confirmation';
  const notifyUrl = process.env.ALIPAY_NOTIFY_URL ?? 'http://localhost:3001/webhooks/alipay';

  const subject = `Art therapy session with ${appointment.therapist.user.firstName} ${appointment.therapist.user.lastName}`;

  const formHtml = alipay!.pageExec('alipay.trade.page.pay', {
    returnUrl,
    notifyUrl,
    bizContent: {
      out_trade_no: outTradeNo,
      total_amount: totalYuan,
      subject,
      product_code: 'FAST_INSTANT_TRADE_PAY',
    },
  });

  // pageExec returns an HTML form string; extract the action URL for API convenience.
  // For web redirect flow, we return the full form so frontend can submit it,
  // or construct the URL from the form action for a GET redirect.
  // alipay-sdk's exec() with method:'GET' returns a direct URL:
  const payUrl = alipay!.exec('alipay.trade.page.pay', {
    returnUrl,
    notifyUrl,
    bizContent: {
      out_trade_no: outTradeNo,
      total_amount: totalYuan,
      subject,
      product_code: 'FAST_INSTANT_TRADE_PAY',
    },
  });

  const payment = await prisma.payment.create({
    data: {
      appointmentId,
      provider: 'ALIPAY',
      externalOrderId: outTradeNo,
      amount: totalCents,
      currency: 'cny',
      platformFeeAmount: platformFee,
      therapistPayoutAmount: therapistPayout,
    },
  });

  return { payUrl, paymentId: payment.id };
};

export const handleAlipayNotification = async (params: Record<string, string>) => {
  // Verify Alipay signature
  const isValid = alipay!.checkNotifySign(params);
  if (!isValid) throw new Error('Invalid Alipay signature');

  const { out_trade_no, trade_no, trade_status } = params;

  // Only process TRADE_SUCCESS or TRADE_FINISHED
  if (trade_status !== 'TRADE_SUCCESS' && trade_status !== 'TRADE_FINISHED') {
    return 'success'; // acknowledge but take no action
  }

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
  if (payment.status === 'SUCCEEDED') return 'success'; // idempotent

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'SUCCEEDED', externalTradeNo: trade_no },
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

  return 'success';
};
