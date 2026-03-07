import { Request, Response } from 'express';
import type { AppointmentStatus, CertificateType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { uploadAsset, deleteAsset } from '../services/upload.service';

const PROVIDER_CERT_TYPES: CertificateType[] = ['THERAPIST', 'COUNSELOR'];
const ACTIVE_APPOINTMENT_STATUSES: AppointmentStatus[] = ['PENDING', 'CONFIRMED', 'IN_PROGRESS'];

const toNumberOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const parseMinutes = (hhmm: string): number => {
  const [hRaw, mRaw] = hhmm.split(':');
  const h = Number(hRaw);
  const m = Number(mRaw);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return h * 60 + m;
};

const toIsoAtDate = (date: string, minutes: number): string => {
  const hh = String(Math.floor(minutes / 60)).padStart(2, '0');
  const mm = String(minutes % 60).padStart(2, '0');
  return new Date(`${date}T${hh}:${mm}:00`).toISOString();
};

const mapTherapist = (profile: any) => {
  const firstApprovedCert = (profile.certificates ?? []).find(
    (c: any) => PROVIDER_CERT_TYPES.includes(c.type) && c.status === 'APPROVED',
  );
  const certificateUrl =
    firstApprovedCert?.certificateUrl ??
    firstApprovedCert?.certificateUrls?.[0] ??
    null;

  return {
    id: profile.id,
    userId: profile.userId,
    user: profile.user,
    bio: profile.bio ?? '',
    specialties: profile.specialties ?? [],
    sessionPrice: toNumberOrNull(profile.sessionPrice),
    sessionLength: profile.sessionLength ?? 60,
    locationCity: profile.locationCity ?? '',
    isAccepting: profile.isAccepting ?? true,
    rating: profile.rating,
    reviewCount: profile.reviewCount ?? 0,
    stripeAccountId: profile.stripeAccountId ?? null,
    stripeAccountStatus: profile.stripeAccountStatus,
    refundPolicy: profile.refundPolicy ?? null,
    featuredImageUrl: profile.featuredImageUrl ?? null,
    socialMediaLink: profile.socialMediaLink ?? null,
    qrCodeUrl: profile.qrCodeUrl ?? null,
    profileStatus: profile.profileStatus,
    rejectionReason: profile.rejectionReason ?? null,
    submittedAt: profile.submittedAt ?? null,
    reviewedAt: profile.reviewedAt ?? null,
    consultEnabled: profile.consultEnabled ?? false,
    hourlyConsultFee: toNumberOrNull(profile.hourlyConsultFee),
    certificateUrl,
    galleryImages: (profile.galleryImages ?? []).map((img: any) => ({
      id: img.id,
      therapistId: profile.id,
      url: img.url,
      order: img.order,
      createdAt: img.createdAt,
    })),
  };
};

const findProfileByIdOrUserId = async (idOrUserId: string) => {
  return prisma.userProfile.findFirst({
    where: { OR: [{ id: idOrUserId }, { userId: idOrUserId }] },
    include: {
      user: true,
      certificates: true,
      refundPolicy: true,
      galleryImages: { orderBy: { order: 'asc' } },
    },
  });
};

export const listTherapists = async (req: Request, res: Response) => {
  const {
    search,
    specialties,
    city,
    maxPrice,
    sortBy,
    page = '1',
    limit = '12',
  } = req.query as Record<string, string | undefined>;

  const parsedPage = Math.max(1, Number(page) || 1);
  const parsedLimit = Math.min(100, Math.max(1, Number(limit) || 12));
  const skip = (parsedPage - 1) * parsedLimit;

  const where: any = {
    profileStatus: 'APPROVED',
    certificates: {
      some: {
        type: { in: PROVIDER_CERT_TYPES },
        status: 'APPROVED',
      },
    },
  };

  if (city?.trim()) {
    where.locationCity = { contains: city.trim(), mode: 'insensitive' };
  }

  if (search?.trim()) {
    const q = search.trim();
    where.OR = [
      { user: { firstName: { contains: q, mode: 'insensitive' } } },
      { user: { lastName: { contains: q, mode: 'insensitive' } } },
      { locationCity: { contains: q, mode: 'insensitive' } },
      { specialties: { hasSome: [q] } },
    ];
  }

  if (specialties?.trim()) {
    const list = specialties
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
    if (list.length) where.specialties = { hasSome: list };
  }

  if (maxPrice !== undefined && maxPrice !== '') {
    const max = Number(maxPrice);
    if (Number.isFinite(max)) where.sessionPrice = { lte: max };
  }

  const orderBy =
    sortBy === 'rating'
      ? [{ rating: 'desc' as const }, { reviewCount: 'desc' as const }]
      : sortBy === 'price_asc'
        ? [{ sessionPrice: 'asc' as const }]
        : sortBy === 'price_desc'
          ? [{ sessionPrice: 'desc' as const }]
          : [{ reviewCount: 'desc' as const }, { createdAt: 'desc' as const }];

  const [items, total] = await Promise.all([
    prisma.userProfile.findMany({
      where,
      skip,
      take: parsedLimit,
      orderBy,
      include: {
        user: true,
        certificates: true,
        refundPolicy: true,
        galleryImages: { orderBy: { order: 'asc' } },
      },
    }),
    prisma.userProfile.count({ where }),
  ]);

  res.json({
    data: items.map(mapTherapist),
    total,
    page: parsedPage,
    limit: parsedLimit,
    totalPages: Math.ceil(total / parsedLimit),
  });
};

export const getTherapistById = async (req: Request, res: Response) => {
  const profile = await findProfileByIdOrUserId(req.params.id);
  if (!profile) return res.status(404).json({ message: 'Therapist not found' });

  const hasProviderCert = (profile.certificates ?? []).some(
    (c) => PROVIDER_CERT_TYPES.includes(c.type) && c.status === 'APPROVED',
  );
  if (!hasProviderCert) return res.status(404).json({ message: 'Therapist not found' });

  res.json(mapTherapist(profile));
};

export const getTherapistSlots = async (req: Request, res: Response) => {
  const { therapistId } = req.params;
  const { date, duration } = req.query as { date?: string; duration?: string };

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ message: 'date query is required in YYYY-MM-DD format' });
  }

  const profile = await findProfileByIdOrUserId(therapistId);
  if (!profile) return res.status(404).json({ message: 'Therapist not found' });

  const slotDuration = Math.min(240, Math.max(30, Number(duration) || profile.sessionLength || 60));
  const dayStart = new Date(`${date}T00:00:00`);
  const dayEnd = new Date(`${date}T23:59:59.999`);
  const dayOfWeek = dayStart.getDay();

  const [availability, appointments] = await Promise.all([
    prisma.availability.findMany({
      where: { userProfileId: profile.id, dayOfWeek },
      orderBy: { startTime: 'asc' },
    }),
    prisma.appointment.findMany({
      where: {
        userProfileId: profile.id,
        status: { in: ACTIVE_APPOINTMENT_STATUSES },
        startTime: { lt: dayEnd },
        endTime: { gt: dayStart },
      },
      select: { startTime: true, endTime: true },
    }),
  ]);

  const windows =
    availability.length > 0
      ? availability.map((a) => ({ start: parseMinutes(a.startTime), end: parseMinutes(a.endTime) }))
      : [{ start: 9 * 60, end: 18 * 60 }];

  const now = new Date();
  const slots: Array<{ startTime: string; endTime: string; available: boolean }> = [];

  for (const window of windows) {
    for (let start = window.start; start + slotDuration <= window.end; start += 30) {
      const end = start + slotDuration;
      const slotStart = new Date(toIsoAtDate(date, start));
      const slotEnd = new Date(toIsoAtDate(date, end));

      if (slotStart <= now) continue;

      const overlaps = appointments.some((a) => slotStart < a.endTime && slotEnd > a.startTime);
      if (!overlaps) {
        slots.push({
          startTime: slotStart.toISOString(),
          endTime: slotEnd.toISOString(),
          available: true,
        });
      }
    }
  }

  res.json(slots);
};

export const updateTherapistProfileById = async (req: Request, res: Response) => {
  const profile = await findProfileByIdOrUserId(req.params.id);
  if (!profile) return res.status(404).json({ message: 'Therapist not found' });

  const isOwner = req.user?.id === profile.userId;
  const isAdmin = req.user?.role === 'ADMIN';
  if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Forbidden' });

  const body = req.body as Record<string, unknown>;
  const data: any = {};
  const assignables = [
    'bio',
    'specialties',
    'sessionPrice',
    'sessionLength',
    'locationCity',
    'isAccepting',
    'featuredImageUrl',
    'socialMediaLink',
    'qrCodeUrl',
    'consultEnabled',
    'hourlyConsultFee',
  ];
  for (const key of assignables) {
    if (body[key] !== undefined) data[key] = body[key];
  }

  const updated = await prisma.userProfile.update({
    where: { id: profile.id },
    data,
    include: {
      user: true,
      certificates: true,
      refundPolicy: true,
      galleryImages: { orderBy: { order: 'asc' } },
    },
  });

  res.json(mapTherapist(updated));
};

export const submitTherapistProfile = async (req: Request, res: Response) => {
  const profile = await findProfileByIdOrUserId(req.params.id);
  if (!profile) return res.status(404).json({ message: 'Therapist not found' });

  const isOwner = req.user?.id === profile.userId;
  const isAdmin = req.user?.role === 'ADMIN';
  if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Forbidden' });

  const updated = await prisma.userProfile.update({
    where: { id: profile.id },
    data: {
      profileStatus: 'PENDING_REVIEW',
      submittedAt: new Date(),
    },
    include: {
      user: true,
      certificates: true,
      refundPolicy: true,
      galleryImages: { orderBy: { order: 'asc' } },
    },
  });

  res.json(mapTherapist(updated));
};

export const getPendingTherapistProfiles = async (_req: Request, res: Response) => {
  const profiles = await prisma.userProfile.findMany({
    where: {
      profileStatus: 'PENDING_REVIEW',
      certificates: {
        some: {
          type: { in: PROVIDER_CERT_TYPES },
          status: { in: ['APPROVED', 'PENDING', 'REJECTED', 'REVOKED'] },
        },
      },
    },
    include: {
      user: true,
      certificates: true,
      refundPolicy: true,
      galleryImages: { orderBy: { order: 'asc' } },
    },
    orderBy: { submittedAt: 'asc' },
  });

  res.json(profiles.map(mapTherapist));
};

export const reviewTherapistProfile = async (req: Request, res: Response) => {
  const { action, rejectionReason } = req.body as { action?: 'APPROVE' | 'REJECT'; rejectionReason?: string };
  const profile = await findProfileByIdOrUserId(req.params.id);
  if (!profile) return res.status(404).json({ message: 'Therapist not found' });

  if (!action || !['APPROVE', 'REJECT'].includes(action)) {
    return res.status(400).json({ message: 'action must be APPROVE or REJECT' });
  }

  const updated = await prisma.userProfile.update({
    where: { id: profile.id },
    data: {
      profileStatus: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
      rejectionReason: action === 'REJECT' ? rejectionReason?.trim() || null : null,
      reviewedAt: new Date(),
    },
    include: {
      user: true,
      certificates: true,
      refundPolicy: true,
      galleryImages: { orderBy: { order: 'asc' } },
    },
  });

  res.json(mapTherapist(updated));
};

export const addTherapistGalleryImage = async (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

  const profile = await findProfileByIdOrUserId(req.params.therapistId);
  if (!profile) return res.status(404).json({ message: 'Therapist not found' });

  const isOwner = req.user?.id === profile.userId;
  const isAdmin = req.user?.role === 'ADMIN';
  if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Forbidden' });

  const count = await prisma.galleryImage.count({ where: { userProfileId: profile.id } });
  if (count >= 9) return res.status(400).json({ message: 'Maximum 9 gallery images allowed' });

  const safeId = `${profile.userId}-${Date.now()}`;
  const url = await uploadAsset(req.file.buffer, 'therapist-gallery', safeId);
  const image = await prisma.galleryImage.create({
    data: {
      userProfileId: profile.id,
      url,
      order: count,
    },
  });

  res.status(201).json({
    image: {
      id: image.id,
      therapistId: profile.id,
      url: image.url,
      order: image.order,
      createdAt: image.createdAt,
    },
  });
};

export const deleteTherapistGalleryImage = async (req: Request, res: Response) => {
  const { therapistId, imageId } = req.params;
  const profile = await findProfileByIdOrUserId(therapistId);
  if (!profile) return res.status(404).json({ message: 'Therapist not found' });

  const isOwner = req.user?.id === profile.userId;
  const isAdmin = req.user?.role === 'ADMIN';
  if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Forbidden' });

  const image = await prisma.galleryImage.findUnique({ where: { id: imageId } });
  if (!image || image.userProfileId !== profile.id) {
    return res.status(404).json({ message: 'Image not found' });
  }

  await deleteAsset(image.url);
  await prisma.galleryImage.delete({ where: { id: image.id } });
  res.status(204).send();
};

export const reorderTherapistGalleryImages = async (req: Request, res: Response) => {
  const { therapistId } = req.params;
  const { order } = req.body as { order?: string[] };
  if (!Array.isArray(order)) return res.status(400).json({ message: 'order must be an array of image ids' });

  const profile = await findProfileByIdOrUserId(therapistId);
  if (!profile) return res.status(404).json({ message: 'Therapist not found' });

  const isOwner = req.user?.id === profile.userId;
  const isAdmin = req.user?.role === 'ADMIN';
  if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Forbidden' });

  await prisma.$transaction(
    order.map((id, index) =>
      prisma.galleryImage.update({
        where: { id },
        data: { order: index },
      }),
    ),
  );

  res.status(204).send();
};
