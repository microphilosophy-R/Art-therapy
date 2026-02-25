import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { processAppointmentRefund } from '../services/refund.service';
import type { CreateAppointmentInput } from '../schemas/appointment.schemas';

export const createAppointment = async (req: Request, res: Response) => {
  const body = req.body as CreateAppointmentInput;

  const therapist = await prisma.therapistProfile.findUnique({
    where: { id: body.therapistId },
  });
  if (!therapist) return res.status(404).json({ message: 'Therapist not found' });
  if (!therapist.isAccepting) return res.status(400).json({ message: 'Therapist is not accepting new clients' });
  if (therapist.stripeAccountStatus !== 'ACTIVE') {
    return res.status(400).json({ message: 'Therapist payment account is not active' });
  }

  // Conflict check
  const conflict = await prisma.appointment.findFirst({
    where: {
      therapistId: body.therapistId,
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
      therapistId: body.therapistId,
      startTime: new Date(body.startTime),
      endTime: new Date(body.endTime),
      medium: body.medium,
      clientNotes: body.clientNotes,
    },
    include: { therapist: { include: { user: true } }, client: true },
  });

  res.status(201).json(appointment);
};

export const listAppointments = async (req: Request, res: Response) => {
  const { status, page = 1, limit = 20 } = req.query as any;
  const user = req.user!;

  const where: any = {
    ...(user.role === 'CLIENT' ? { clientId: user.id } : {}),
    ...(user.role === 'THERAPIST'
      ? { therapist: { userId: user.id } }
      : {}),
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
        therapist: { include: { user: true } },
        payment: true,
      },
    }),
    prisma.appointment.count({ where }),
  ]);

  res.json({ data, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) });
};

export const getAppointment = async (req: Request, res: Response) => {
  const appt = await prisma.appointment.findUnique({
    where: { id: req.params.id },
    include: { client: true, therapist: { include: { user: true } }, payment: true, sessionNote: true },
  });
  if (!appt) return res.status(404).json({ message: 'Appointment not found' });

  const userId = req.user!.id;
  const isClient = appt.clientId === userId;
  const isTherapist = appt.therapist.userId === userId;
  const isAdmin = req.user!.role === 'ADMIN';

  if (!isClient && !isTherapist && !isAdmin) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  res.json(appt);
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
    include: { therapist: true, payment: true },
  });
  if (!appt) return res.status(404).json({ message: 'Appointment not found' });

  const isTherapist = appt.therapist.userId === req.user!.id;
  const isAdmin = req.user!.role === 'ADMIN';
  if (!isTherapist && !isAdmin) return res.status(403).json({ message: 'Forbidden' });

  const updated = await prisma.appointment.update({
    where: { id: appt.id },
    data: { status },
  });

  if (status === 'CANCELLED' && appt.payment?.status === 'SUCCEEDED') {
    await processAppointmentRefund(appt.id, true); // therapist cancels = always full refund
  }

  res.json(updated);
};

export const createNote = async (req: Request, res: Response) => {
  const appt = await prisma.appointment.findUnique({
    where: { id: req.params.id },
    include: { therapist: true },
  });
  if (!appt) return res.status(404).json({ message: 'Not found' });
  if (appt.therapist.userId !== req.user!.id) return res.status(403).json({ message: 'Forbidden' });

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
