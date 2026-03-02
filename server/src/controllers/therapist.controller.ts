import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import type { UpdateProfileInput, AvailabilityInput, ReviewProfileInput } from '../schemas/therapist.schemas';
import { Prisma } from '@prisma/client';
import { uploadAsset, deleteAsset } from '../services/upload.service';
import {
  notifyAdminsOnProfileSubmitted,
  notifyTherapistOnProfileApproved,
  notifyTherapistOnProfileRejected,
} from '../services/message.service';

const PROFILE_INCLUDE = {
  user: true,
  refundPolicy: true,
  galleryImages: { orderBy: { order: Prisma.SortOrder.asc } },
} satisfies Prisma.TherapistProfileInclude;

export const listTherapists = async (req: Request, res: Response) => {
  const { search, specialty, city, minPrice, maxPrice, medium, sortBy, page = 1, limit = 12 } = req.query as any;

  const where: Prisma.TherapistProfileWhereInput = {
    isAccepting: true,
    profileStatus: 'APPROVED',
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
  const { id } = req.params;
  const requester = req.user;

  const profile = await prisma.therapistProfile.findFirst({
    where: { OR: [{ id }, { userId: id }] },
    include: {
      ...PROFILE_INCLUDE,
      reviews: { include: { client: true }, orderBy: { createdAt: 'desc' }, take: 10 },
    },
  });
  if (!profile) return res.status(404).json({ message: 'Therapist not found' });

  // Visibility: non-APPROVED profiles are only visible to the owner or admin
  if (profile.profileStatus !== 'APPROVED') {
    if (!requester) return res.status(404).json({ message: 'Therapist not found' });
    const requesterHasTherapistCert = requester.approvedCertificates?.includes('THERAPIST' as any);
    if (requester.role !== 'ADMIN' && (!requesterHasTherapistCert || profile.userId !== requester.id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
  }

  res.json(profile);
};

export const getAvailableSlots = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { date, duration: durationParam } = req.query as { date?: string; duration?: string };
  if (!date) return res.status(400).json({ message: 'date query param required (YYYY-MM-DD)' });

  const profile = await prisma.therapistProfile.findUnique({
    where: { id },
    include: { availability: true },
  });
  if (!profile) return res.status(404).json({ message: 'Therapist not found' });

  const duration = durationParam
    ? Math.max(30, Math.min(180, parseInt(durationParam, 10) || profile.sessionLength))
    : profile.sessionLength;
  const BASE_UNIT = 30;

  const requestedDate = new Date(date);
  const dayOfWeek = requestedDate.getDay();
  const avail = profile.availability.find((a) => a.dayOfWeek === dayOfWeek);
  if (!avail) return res.json([]);

  const [startH, startM] = avail.startTime.split(':').map(Number);
  const [endH, endM] = avail.endTime.split(':').map(Number);
  const windowStart = startH * 60 + startM;
  const windowEnd = endH * 60 + endM;

  const allBlockStarts: number[] = [];
  for (let t = windowStart; t + BASE_UNIT <= windowEnd; t += BASE_UNIT) {
    allBlockStarts.push(t);
  }

  const booked = await prisma.appointment.findMany({
    where: {
      therapistId: id,
      status: { in: ['PENDING', 'CONFIRMED'] },
      startTime: { gte: new Date(date), lt: new Date(new Date(date).getTime() + 86400000) },
    },
    select: { startTime: true, endTime: true },
  });

  const overlapsBooked = (slotStartMs: number, slotEndMs: number) =>
    booked.some((b) => slotStartMs < b.endTime.getTime() && b.startTime.getTime() < slotEndMs);

  const slots = allBlockStarts
    .filter((t) => t + duration <= windowEnd)
    .map((t) => {
      const slotStart = new Date(date);
      slotStart.setHours(Math.floor(t / 60), t % 60, 0, 0);
      const slotEnd = new Date(slotStart.getTime() + duration * 60_000);
      return { startTime: slotStart.toISOString(), endTime: slotEnd.toISOString(), available: true };
    })
    .filter((s) => !overlapsBooked(new Date(s.startTime).getTime(), new Date(s.endTime).getTime()));

  res.json(slots);
};

export const updateProfile = async (req: Request, res: Response) => {
  const body = req.body as UpdateProfileInput;
  const userId = req.user!.id;

  let profile = await prisma.therapistProfile.findUnique({ where: { userId } });

  if (!profile) {
    const hasTherapistCert = req.user!.approvedCertificates?.includes('THERAPIST' as any);
    if (hasTherapistCert) {
      const created = await prisma.therapistProfile.create({
        data: { ...(body as any), userId, profileStatus: 'DRAFT' },
        include: PROFILE_INCLUDE,
      });
      return res.status(201).json(created);
    }
    return res.status(404).json({ message: 'Profile not found' });
  }

  if (req.params.id !== profile.id && req.params.id !== userId && req.user!.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Forbidden' });
  }

  // Any edit resets approval status back to DRAFT (requires re-submission)
  const updated = await prisma.therapistProfile.update({
    where: { id: profile.id },
    data: {
      ...(body as any),
      // Only reset to DRAFT if currently APPROVED (don't reset PENDING_REVIEW)
      ...(profile.profileStatus === 'APPROVED' ? { profileStatus: 'DRAFT' } : {}),
    },
    include: PROFILE_INCLUDE,
  });
  res.json(updated);
};

export const submitProfile = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const profile = await prisma.therapistProfile.findFirst({
    where: { OR: [{ id }, { userId: id }] },
    include: { user: true },
  });
  if (!profile) return res.status(404).json({ message: 'Profile not found' });
  if (profile.userId !== userId) return res.status(403).json({ message: 'Forbidden' });

  if (profile.profileStatus === 'PENDING_REVIEW') {
    return res.status(400).json({ message: 'Profile is already pending review' });
  }
  if (profile.profileStatus === 'APPROVED') {
    return res.status(400).json({ message: 'Profile is already approved' });
  }

  const updated = await prisma.therapistProfile.update({
    where: { id: profile.id },
    data: { profileStatus: 'PENDING_REVIEW', submittedAt: new Date(), rejectionReason: null },
    include: PROFILE_INCLUDE,
  });

  const therapistName = `${profile.user.firstName} ${profile.user.lastName}`;
  await notifyAdminsOnProfileSubmitted(profile.id, therapistName).catch(() => {});

  res.json(updated);
};

export const reviewProfile = async (req: Request, res: Response) => {
  const { id } = req.params;
  const body = req.body as ReviewProfileInput;

  const profile = await prisma.therapistProfile.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!profile) return res.status(404).json({ message: 'Profile not found' });
  if (profile.profileStatus !== 'PENDING_REVIEW') {
    return res.status(400).json({ message: 'Only PENDING_REVIEW profiles can be reviewed' });
  }

  if (body.action === 'APPROVE') {
    const updated = await prisma.therapistProfile.update({
      where: { id },
      data: { profileStatus: 'APPROVED', reviewedAt: new Date(), rejectionReason: null },
      include: PROFILE_INCLUDE,
    });
    await notifyTherapistOnProfileApproved(profile.userId).catch(() => {});
    return res.json(updated);
  }

  const updated = await prisma.therapistProfile.update({
    where: { id },
    data: { profileStatus: 'REJECTED', reviewedAt: new Date(), rejectionReason: body.rejectionReason! },
    include: PROFILE_INCLUDE,
  });
  await notifyTherapistOnProfileRejected(profile.userId, body.rejectionReason!).catch(() => {});
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

// ─── Gallery image management ─────────────────────────────────────────────────

export const addGalleryImage = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;
  const file = (req as any).file as Express.Multer.File | undefined;

  if (!file) return res.status(400).json({ message: 'No file uploaded' });

  const profile = await prisma.therapistProfile.findFirst({
    where: { OR: [{ id }, { userId: id }] },
    include: { galleryImages: true },
  });
  if (!profile) return res.status(404).json({ message: 'Profile not found' });
  if (profile.userId !== userId && req.user!.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Forbidden' });
  }
  if (profile.galleryImages.length >= 9) {
    return res.status(400).json({ message: 'Maximum of 9 gallery images allowed' });
  }

  const imageRecord = await prisma.galleryImage.create({
    data: { therapistId: profile.id, url: '', order: profile.galleryImages.length },
  });

  let url: string;
  try {
    url = await uploadAsset(file.buffer, 'therapist-gallery', `gallery-${imageRecord.id}.jpg`);
  } catch (err: any) {
    await prisma.galleryImage.delete({ where: { id: imageRecord.id } }).catch(() => {});
    return res.status(500).json({ message: 'Image upload failed. Please try again.' });
  }

  const updated = await prisma.galleryImage.update({
    where: { id: imageRecord.id },
    data: { url },
  });

  res.status(201).json({ image: updated });
};

export const deleteGalleryImage = async (req: Request, res: Response) => {
  const { id, imageId } = req.params;
  const userId = req.user!.id;

  const image = await prisma.galleryImage.findUnique({
    where: { id: imageId },
    include: { therapist: true },
  });
  if (!image || image.therapist?.id !== id) return res.status(404).json({ message: 'Image not found' });
  if (image.therapist?.userId !== userId && req.user!.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Forbidden' });
  }

  await deleteAsset(image.url);
  await prisma.galleryImage.delete({ where: { id: imageId } });

  res.status(204).send();
};

export const reorderGalleryImages = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;
  const { order } = req.body as { order: string[] };

  if (!Array.isArray(order)) return res.status(400).json({ message: 'order must be an array of image IDs' });

  const profile = await prisma.therapistProfile.findFirst({
    where: { OR: [{ id }, { userId: id }] },
    include: { galleryImages: true },
  });
  if (!profile) return res.status(404).json({ message: 'Profile not found' });
  if (profile.userId !== userId && req.user!.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const imageIds = new Set(profile.galleryImages.map((img) => img.id));
  if (!order.every((imgId) => imageIds.has(imgId))) {
    return res.status(400).json({ message: 'Invalid image IDs in order array' });
  }

  await prisma.$transaction(
    order.map((imgId, idx) =>
      prisma.galleryImage.update({ where: { id: imgId }, data: { order: idx } })
    )
  );

  res.status(200).json({ message: 'Order updated' });
};

// ─── Admin: list pending profiles ─────────────────────────────────────────────

export const listPendingProfiles = async (req: Request, res: Response) => {
  const profiles = await prisma.therapistProfile.findMany({
    where: { profileStatus: 'PENDING_REVIEW' },
    include: { user: true, galleryImages: { orderBy: { order: 'asc' } } },
    orderBy: { submittedAt: 'asc' },
  });
  res.json(profiles);
};
