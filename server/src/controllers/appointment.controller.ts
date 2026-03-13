import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { processAppointmentRefund } from '../services/refund.service';
import type { CreateAppointmentInput } from '../schemas/appointment.schemas';
import { isSlotWithinConsultWindow } from '../utils/consultSchedule';

const paymentsEnabled = process.env.PAYMENTS_ENABLED !== 'false';

const ACCEPT_DEADLINE_HOURS = 24;
const WARN_DEADLINE_HOURS = 48;

const checkAndAutoCancel = async (appt: any): Promise<any> => {
  if (appt.status !== 'PENDING') return appt;

  const deadlineMs = new Date(appt.startTime).getTime() - ACCEPT_DEADLINE_HOURS * 60 * 60 * 1000;
  if (Date.now() < deadlineMs) return appt;

  const cancelled = await prisma.appointment.update({
    where: { id: appt.id },
    data: { status: 'CANCELLED' },
  });

  await prisma.message.create({
    data: {
      recipientId: appt.clientId,
      body: `Your appointment on ${new Date(appt.startTime).toLocaleString()} was automatically cancelled because the provider did not confirm in time.`,
      trigger: 'APPOINTMENT_AUTO_CANCELLED',
    },
  });

  if (appt.payment?.status === 'SUCCEEDED') {
    await processAppointmentRefund(appt.id, false);
  }

  return { ...cancelled, payment: appt.payment, client: appt.client, userProfile: appt.userProfile, sessionNote: appt.sessionNote };
};

const maybeSendDeadlineWarning = async (appt: any): Promise<void> => {
  if (appt.status !== 'PENDING') return;
  if (!appt.userProfile?.userId) return;

  const warnMs = new Date(appt.startTime).getTime() - WARN_DEADLINE_HOURS * 60 * 60 * 1000;
  if (Date.now() < warnMs) return;

  const alreadySent = await prisma.message.findFirst({
    where: {
      recipientId: appt.userProfile.userId,
      trigger: 'APPOINTMENT_DEADLINE_WARNING',
      body: { contains: appt.id },
    },
  });
  if (alreadySent) return;

  const deadline = new Date(new Date(appt.startTime).getTime() - ACCEPT_DEADLINE_HOURS * 60 * 60 * 1000);
  await prisma.message.create({
    data: {
      recipientId: appt.userProfile.userId,
      body: `Reminder: You have a pending appointment on ${new Date(appt.startTime).toLocaleString()} (ID: ${appt.id}). Please confirm or cancel before ${deadline.toLocaleString()} to avoid auto-cancellation.`,
      trigger: 'APPOINTMENT_DEADLINE_WARNING',
    },
  });
};

export const createAppointment = async (req: Request, res: Response) => {
  const body = req.body as CreateAppointmentInput;

  const providerProfile = await prisma.userProfile.findUnique({
    where: { id: body.therapistId },
  });
  if (!providerProfile) return res.status(404).json({ message: 'Provider profile not found' });
  if (!providerProfile.isAccepting) return res.status(400).json({ message: 'Provider is not accepting new clients' });
  if (paymentsEnabled && providerProfile.stripeAccountStatus !== 'ACTIVE') {
    return res.status(400).json({ message: 'Provider payment account is not active' });
  }

  const slotStart = new Date(body.startTime);
  const slotEnd = new Date(body.endTime);

  const publishedConsultPlans = await prisma.therapyPlan.findMany({
    where: {
      userProfileId: body.therapistId,
      type: 'PERSONAL_CONSULT',
      status: 'PUBLISHED',
      reviewedAt: { not: null },
      publishedAt: { not: null },
    },
    orderBy: [{ publishedAt: 'desc' }, { updatedAt: 'desc' }],
    select: {
      id: true,
      consultDateStart: true,
      consultDateEnd: true,
      consultWorkStartMin: true,
      consultWorkEndMin: true,
      consultTimezone: true,
    },
  });

  if (publishedConsultPlans.length !== 1) {
    return res.status(409).json({
      code: 'CONSULT_PLAN_UNCONFIGURED',
      message:
        'Personal consult schedule is not configured. Exactly one published PERSONAL_CONSULT plan is required.',
    });
  }

  const consultPlan = publishedConsultPlans[0];
  if (!isSlotWithinConsultWindow(slotStart, slotEnd, consultPlan)) {
    return res.status(409).json({
      code: 'CONSULT_SLOT_OUT_OF_WINDOW',
      message: 'Selected time is outside the provider consult schedule window.',
    });
  }

  const conflict = await prisma.appointment.findFirst({
    where: {
      userProfileId: body.therapistId,
      status: { in: ['PENDING', 'CONFIRMED'] },
      OR: [
        { startTime: { lt: new Date(body.endTime), gte: new Date(body.startTime) } },
        { endTime: { gt: new Date(body.startTime), lte: new Date(body.endTime) } },
      ],
    },
  });
  if (conflict) return res.status(409).json({ message: 'This time slot is already booked' });

  const appointment = await prisma.appointment.create({
    data: {
      clientId: req.user!.id,
      userProfileId: body.therapistId,
      startTime: slotStart,
      endTime: slotEnd,
      medium: body.medium,
      clientNotes: body.clientNotes,
      status: paymentsEnabled ? 'PENDING' : 'CONFIRMED',
    },
    include: { userProfile: { include: { user: true } }, client: true, payment: true },
  });

  res.status(201).json({ ...appointment, therapist: appointment.userProfile });
};

export const listAppointments = async (req: Request, res: Response) => {
  const { status, page = 1, limit = 20 } = req.query as any;
  const user = req.user!;
  const isProvider = user.approvedCertificates?.some((cert) => cert === 'THERAPIST' || cert === 'COUNSELOR');

  const where: any = {
    ...(user.role === 'ADMIN' ? {} : (isProvider ? { userProfile: { userId: user.id } } : { clientId: user.id })),
    ...(status ? { status: { in: Array.isArray(status) ? status : [status] } } : {}),
  };

  const skip = (Number(page) - 1) * Number(limit);
  const [data, total] = await Promise.all([
    prisma.appointment.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { startTime: 'desc' },
      include: {
        client: true,
        userProfile: { include: { user: true } },
        payment: true,
      },
    }),
    prisma.appointment.count({ where }),
  ]);

  const normalized = data.map((a) => ({ ...a, therapist: a.userProfile }));
  res.json({ data: normalized, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) });
};

export const getAppointment = async (req: Request, res: Response) => {
  const appt = await prisma.appointment.findUnique({
    where: { id: req.params.id },
    include: { client: true, userProfile: { include: { user: true } }, payment: true, sessionNote: true },
  });
  if (!appt) return res.status(404).json({ message: 'Appointment not found' });

  const userId = req.user!.id;
  const isClient = appt.clientId === userId;
  const isProvider = appt.userProfile?.userId === userId;
  const isAdmin = req.user!.role === 'ADMIN';

  if (!isClient && !isProvider && !isAdmin) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  await maybeSendDeadlineWarning(appt);
  const checkedAppt = await checkAndAutoCancel(appt);

  const acceptanceDeadline = new Date(checkedAppt.startTime).getTime() - ACCEPT_DEADLINE_HOURS * 60 * 60 * 1000;
  res.json({ ...checkedAppt, therapist: checkedAppt.userProfile, acceptanceDeadline: new Date(acceptanceDeadline).toISOString() });
};

export const cancelAppointment = async (req: Request, res: Response) => {
  const appt = await prisma.appointment.findUnique({
    where: { id: req.params.id },
    include: { payment: true },
  });
  if (!appt) return res.status(404).json({ message: 'Appointment not found' });
  if (appt.clientId !== req.user!.id) return res.status(403).json({ message: 'Forbidden' });
  if (!['PENDING', 'CONFIRMED'].includes(appt.status)) {
    return res.status(400).json({ message: 'Cannot cancel this appointment' });
  }

  await prisma.appointment.update({ where: { id: appt.id }, data: { status: 'CANCELLED' } });

  if (appt.payment?.status === 'SUCCEEDED') {
    await processAppointmentRefund(appt.id, false);
  }

  res.json({ message: 'Appointment cancelled' });
};

export const updateAppointmentStatus = async (req: Request, res: Response) => {
  const { status } = req.body;
  const appt = await prisma.appointment.findUnique({
    where: { id: req.params.id },
    include: { userProfile: true, payment: true },
  });
  if (!appt) return res.status(404).json({ message: 'Appointment not found' });

  const isProvider = appt.userProfile?.userId === req.user!.id;
  const isAdmin = req.user!.role === 'ADMIN';
  if (!isProvider && !isAdmin) return res.status(403).json({ message: 'Forbidden' });

  const allowed: Record<string, string[]> = {
    PENDING: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['IN_PROGRESS', 'CANCELLED', 'COMPLETED'],
    IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  };
  if (!allowed[appt.status]?.includes(status)) {
    return res.status(400).json({ message: `Cannot transition from ${appt.status} to ${status}` });
  }

  const maybeCancelled = await checkAndAutoCancel(appt);
  if (maybeCancelled.status === 'CANCELLED') {
    return res.status(400).json({ message: 'Appointment was auto-cancelled due to acceptance deadline' });
  }

  const updated = await prisma.appointment.update({
    where: { id: appt.id },
    data: { status },
  });

  if (status === 'CANCELLED' && appt.payment?.status === 'SUCCEEDED') {
    await processAppointmentRefund(appt.id, true);
  }

  res.json(updated);
};

export const createNote = async (req: Request, res: Response) => {
  const appt = await prisma.appointment.findUnique({
    where: { id: req.params.id },
    include: { userProfile: true },
  });
  if (!appt) return res.status(404).json({ message: 'Not found' });
  if (appt.userProfile?.userId !== req.user!.id) return res.status(403).json({ message: 'Forbidden' });

  const note = await prisma.sessionNote.upsert({
    where: { appointmentId: req.params.id },
    create: { appointmentId: req.params.id, ...req.body },
    update: req.body,
  });
  res.status(201).json(note);
};

export const getNote = async (req: Request, res: Response) => {
  const note = await prisma.sessionNote.findUnique({ where: { appointmentId: req.params.id } });
  if (!note) return res.status(404).json({ message: 'Note not found' });
  res.json(note);
};
