import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import type { UpdateProfileInput, AvailabilityInput } from '../schemas/therapist.schemas';
import { Prisma } from '@prisma/client';

export const listTherapists = async (req: Request, res: Response) => {
  const { search, specialty, city, minPrice, maxPrice, medium, sortBy, page = 1, limit = 12 } = req.query as any;

  const where: Prisma.TherapistProfileWhereInput = {
    isAccepting: true,
    ...(search && {
      OR: [
        { user: { firstName: { contains: search, mode: 'insensitive' } } },
        { user: { lastName: { contains: search, mode: 'insensitive' } } },
        { locationCity: { contains: search, mode: 'insensitive' } },
      ],
    }),
    ...(specialty && { specialties: { has: specialty } }),
    ...(city && { locationCity: { contains: city, mode: 'insensitive' } }),
    ...(minPrice !== undefined || maxPrice !== undefined
      ? {
          sessionPrice: {
            ...(minPrice !== undefined ? { gte: Number(minPrice) } : {}),
            ...(maxPrice !== undefined ? { lte: Number(maxPrice) } : {}),
          },
        }
      : {}),
  };

  let orderBy: Prisma.TherapistProfileOrderByWithRelationInput;
  switch (sortBy) {
    case 'rating': orderBy = { rating: 'desc' }; break;
    case 'price_asc': orderBy = { sessionPrice: 'asc' }; break;
    case 'price_desc': orderBy = { sessionPrice: 'desc' }; break;
    default: orderBy = { createdAt: 'desc' };
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [data, total] = await Promise.all([
    prisma.therapistProfile.findMany({
      where,
      orderBy,
      skip,
      take: Number(limit),
      include: { user: true, refundPolicy: true },
    }),
    prisma.therapistProfile.count({ where }),
  ]);

  res.json({ data, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) });
};

export const getTherapist = async (req: Request, res: Response) => {
  const profile = await prisma.therapistProfile.findUnique({
    where: { id: req.params.id },
    include: { user: true, refundPolicy: true, reviews: { include: { client: true }, orderBy: { createdAt: 'desc' }, take: 10 } },
  });
  if (!profile) return res.status(404).json({ message: 'Therapist not found' });
  res.json(profile);
};

export const getAvailableSlots = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { date } = req.query as { date?: string };
  if (!date) return res.status(400).json({ message: 'date query param required (YYYY-MM-DD)' });

  const profile = await prisma.therapistProfile.findUnique({
    where: { id },
    include: { availability: true },
  });
  if (!profile) return res.status(404).json({ message: 'Therapist not found' });

  const requestedDate = new Date(date);
  const dayOfWeek = requestedDate.getDay();
  const avail = profile.availability.find((a) => a.dayOfWeek === dayOfWeek);
  if (!avail) return res.json([]);

  // Generate slot times
  const [startH, startM] = avail.startTime.split(':').map(Number);
  const [endH, endM] = avail.endTime.split(':').map(Number);
  const slotMinutes = profile.sessionLength;

  const slots: { startTime: string; endTime: string; available: boolean }[] = [];
  let current = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  while (current + slotMinutes <= endMinutes) {
    const slotStart = new Date(date);
    slotStart.setHours(Math.floor(current / 60), current % 60, 0, 0);
    const slotEnd = new Date(slotStart.getTime() + slotMinutes * 60 * 1000);
    slots.push({ startTime: slotStart.toISOString(), endTime: slotEnd.toISOString(), available: true });
    current += slotMinutes;
  }

  // Remove booked slots
  const booked = await prisma.appointment.findMany({
    where: {
      therapistId: id,
      status: { in: ['PENDING', 'CONFIRMED'] },
      startTime: { gte: new Date(date), lt: new Date(new Date(date).getTime() + 86400000) },
    },
  });

  const availableSlots = slots.filter(
    (s) => !booked.some((b) => b.startTime.toISOString() === s.startTime)
  );

  res.json(availableSlots);
};

export const updateProfile = async (req: Request, res: Response) => {
  const body = req.body as UpdateProfileInput;
  const profile = await prisma.therapistProfile.findUnique({ where: { userId: req.user!.id } });
  if (!profile) return res.status(404).json({ message: 'Profile not found' });
  if (profile.id !== req.params.id && req.user!.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const updated = await prisma.therapistProfile.update({
    where: { id: req.params.id },
    data: body as any,
    include: { user: true },
  });
  res.json(updated);
};

export const setAvailability = async (req: Request, res: Response) => {
  const slots = req.body as AvailabilityInput;
  const profile = await prisma.therapistProfile.findUnique({ where: { userId: req.user!.id } });
  if (!profile) return res.status(404).json({ message: 'Profile not found' });
  if (profile.id !== req.params.id && req.user!.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Forbidden' });
  }

  await prisma.$transaction([
    prisma.availability.deleteMany({ where: { therapistId: req.params.id } }),
    prisma.availability.createMany({
      data: slots.map((s) => ({ ...s, therapistId: req.params.id })),
    }),
  ]);

  res.json({ message: 'Availability updated' });
};
