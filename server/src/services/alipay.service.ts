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
  const totalYuan = (totalCents / 100).toFixed(2);

  const outTradeNo = generateOrderId();
  const returnUrl = process.env.ALIPAY_RETURN_URL || 'http://localhost:5173/booking/confirmation';
  const notifyUrl = process.env.ALIPAY_NOTIFY_URL || 'http://localhost:3001/webhooks/alipay';

  const subject = `Art therapy session with ${appointment.therapist.user.firstName} ${appointment.therapist.user.lastName}`;

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

export const createPlanAlipayOrder = async (participantId: string, userId: string) => {
  const participant = await prisma.therapyPlanParticipant.findUnique({
    where: { id: participantId },
    include: {
      plan: { include: { therapist: { include: { user: true } } } },
      payment: true,
    },
  });

  if (!participant) throw new Error('Participant record not found');
  if (participant.userId !== userId) throw new Error('Forbidden');
  if (!participant.payment) throw new Error('Payment record not found for this participant');
  if (participant.payment.status === 'SUCCEEDED') throw new Error('Payment already completed');

  const totalYuan = (participant.payment.amount / 100).toFixed(2);
  const outTradeNo = generateOrderId();
  const returnUrl = process.env.ALIPAY_RETURN_URL || 'http://localhost:5173/dashboard/client';
  const notifyUrl = process.env.ALIPAY_NOTIFY_URL || 'http://localhost:3001/webhooks/alipay';

  const subject = `Therapy Plan: ${participant.plan.title}`;

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

  await prisma.planPayment.update({
    where: { id: participant.payment.id },
    data: { externalOrderId: outTradeNo },
  });

  return { payUrl, paymentId: participant.payment.id };
};

export const createProductAlipayOrder = async (orderId: string, userId: string) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { payment: true },
  });

  if (!order) throw new Error('Order not found');
  if (order.userId !== userId) throw new Error('Forbidden');
  if (order.status !== 'PENDING') throw new Error('Order is not in PENDING status');
  if (order.payment && order.payment.status === 'SUCCEEDED') {
    throw new Error('Payment already completed');
  }

  const totalYuan = (order.totalAmount / 100).toFixed(2);
  const outTradeNo = generateOrderId();
  const returnUrl = process.env.ALIPAY_RETURN_URL || 'http://localhost:5173/orders';
  const notifyUrl = process.env.ALIPAY_NOTIFY_URL || 'http://localhost:3001/webhooks/alipay';

  const subject = `Art Shopping Order: ${order.id}`;

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

  const payment = order.payment
    ? await prisma.productPayment.update({
      where: { id: order.payment.id },
      data: { externalOrderId: outTradeNo, provider: 'ALIPAY' },
    })
    : await prisma.productPayment.create({
      data: {
        orderId,
        provider: 'ALIPAY',
        externalOrderId: outTradeNo,
        amount: order.totalAmount, // No split fee
        currency: 'cny',
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

  if (payment) {
    if (payment.status === 'SUCCEEDED') return 'success';
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
    }).catch(() => { });
    return 'success';
  }

  // If not found in appointment payments, check therapy plan payments
  const planPayment = await prisma.planPayment.findFirst({
    where: { externalOrderId: out_trade_no },
  });

  if (planPayment) {
    if (planPayment.status === 'SUCCEEDED') return 'success';
    await prisma.$transaction([
      prisma.planPayment.update({
        where: { id: planPayment.id },
        data: { status: 'SUCCEEDED', externalTradeNo: trade_no },
      }),
      prisma.therapyPlanParticipant.update({
        where: { id: planPayment.participantId },
        data: { status: 'SIGNED_UP' as any },
      }),
    ]);
    return 'success';
  }

  // If not found in therapy plans, check product payments
  const productPayment = await prisma.productPayment.findFirst({
    where: { externalOrderId: out_trade_no },
  });

  if (productPayment) {
    if (productPayment.status === 'SUCCEEDED') return 'success';
    await prisma.$transaction([
      prisma.productPayment.update({
        where: { id: productPayment.id },
        data: { status: 'SUCCEEDED', externalTradeNo: trade_no },
      }),
      prisma.order.update({
        where: { id: productPayment.orderId },
        data: { status: 'PAID' },
      }),
    ]);
    return 'success';
  }

  throw new Error('Payment record not found');

  return 'success';
};
