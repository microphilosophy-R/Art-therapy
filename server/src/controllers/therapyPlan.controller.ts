import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { deleteAsset, uploadAsset } from '../services/upload.service';
import {
  notifyAdminsOnPlanSubmitted,
  notifyAllClientsOnPlanPublished,
  notifyTherapistOnRejection,
  notifyParticipantsPlanStarted,
  notifyParticipantsPlanCancelled,
  notifyTherapistOnSignup,
  notifyTherapistOnSignupCancelled,
} from '../services/message.service';
import { refundPlanPayment } from '../services/refundPlanPayment.service';
import type {
  CreateTherapyPlanInput,
  UpdateTherapyPlanInput,
  ReviewTherapyPlanInput,
  ListTherapyPlansQuery,
  UpsertPlanEventsInput,
} from '../schemas/therapyPlan.schemas';
import { buildIcsCalendar, type IcsEvent } from '../services/ics.service';

const THERAPIST_PLAN_INCLUDE = {
  userProfile: {
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          email: true,
        },
      },
    },
  },
  participants: {
    take: 4,
    orderBy: { enrolledAt: Prisma.SortOrder.asc },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
        },
      },
    },
  },
  _count: {
    select: { participants: true },
  },
  events: {
    orderBy: { order: Prisma.SortOrder.asc },
  },
  images: {
    orderBy: { order: Prisma.SortOrder.asc },
  },
  pdfs: {
    orderBy: { order: Prisma.SortOrder.asc },
  },
} satisfies Prisma.TherapyPlanInclude;

const logToFile = (msg: string) => {
  try {
    fs.appendFileSync(path.join(process.cwd(), 'debug.log'), `${new Date().toISOString()} - ${msg}\n`);
  } catch (err) {
    console.error('Failed to log to file:', err);
  }
};

// ─── Create ──────────────────────────────────────────────────────────────────

export const createPlan = async (req: Request, res: Response) => {
  const body = req.body as CreateTherapyPlanInput;

  const userProfile = await prisma.userProfile.findUnique({
    where: { userId: req.user!.id },
  });
  if (!userProfile) {
    return res.status(404).json({ message: 'User profile not found' });
  }

  // Consult types require consultEnabled
  if (
    (body.type === 'PERSONAL_CONSULT' || body.type === 'GROUP_CONSULT') &&
    !userProfile.consultEnabled
  ) {
    return res.status(403).json({
      message: 'You must enable consultations in your profile before creating this plan type.',
    });
  }

  const plan = await prisma.therapyPlan.create({
    data: {
      userProfileId: userProfile.id,
      type: body.type,
      title: body.title,
      slogan: body.slogan ?? null,
      introduction: body.introduction,
      startTime: new Date(body.startTime),
      endTime: body.endTime ? new Date(body.endTime) : null,
      location: body.location,
      maxParticipants: body.maxParticipants ?? null,
      contactInfo: body.contactInfo,
      price: body.price != null ? body.price : null,
      artSalonSubType: body.artSalonSubType ?? null,
      sessionMedium: body.sessionMedium ?? null,
      defaultPosterId: body.posterUrl ? null : (body.defaultPosterId ?? 1),
      posterUrl: body.posterUrl ?? null,
      status: 'DRAFT',
    },
    include: THERAPIST_PLAN_INCLUDE,
  });

  res.status(201).json(plan);
};

// ─── List ─────────────────────────────────────────────────────────────────────

export const listPlans = async (req: Request, res: Response) => {
  const query = req.query as unknown as ListTherapyPlansQuery;
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 12;
  const skip = (page - 1) * limit;
  const user = req.user;
  const userHasTherapistCert = user?.approvedCertificates?.includes('THERAPIST' as any);

  let where: any = {};

  if (!user || (user.role === 'MEMBER' && !userHasTherapistCert)) {
    // Public and clients see plans that are in any active/visible lifecycle status
    const publicStatuses = ['PUBLISHED', 'SIGN_UP_CLOSED', 'IN_PROGRESS', 'FINISHED', 'IN_GALLERY'];
    where = { status: { in: query.status ? [query.status] : publicStatuses } };
  } else if (user.role === 'MEMBER' && userHasTherapistCert) {
    // Therapists see only their own plans (all statuses)
    const profile = await prisma.userProfile.findUnique({ where: { userId: user.id } });
    if (!profile) {
      return res.json({
        data: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      });
    }
    where = { userProfileId: profile.id };
  } else if (user.role === 'ADMIN') {
    // Admins see everything; optionally filter by status or type
    if (query.status) where.status = query.status;
  }

  if (query.type) where.type = query.type;

  const now = new Date();
  if (query.timeFilter === 'past') {
    where.AND = [
      where.status ? { status: where.status } : {},
      where.type ? { type: where.type } : {},
      where.userProfileId ? { userProfileId: where.userProfileId } : {},
      {
        OR: [
          { endTime: { lt: now } },
          { AND: [{ endTime: null }, { startTime: { lt: now } }] },
        ],
      },
    ];
    delete where.status;
    delete where.type;
    delete where.userProfileId;
  } else if (query.timeFilter === 'upcoming') {
    where.AND = [
      where.status ? { status: where.status } : {},
      where.type ? { type: where.type } : {},
      where.userProfileId ? { userProfileId: where.userProfileId } : {},
      {
        OR: [
          { endTime: { gte: now } },
          { AND: [{ endTime: null }, { startTime: { gte: now } }] },
        ],
      },
    ];
    delete where.status;
    delete where.type;
    delete where.userProfileId;
  }

  const [plans, total] = await Promise.all([
    prisma.therapyPlan.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      include: THERAPIST_PLAN_INCLUDE,
    }),
    prisma.therapyPlan.count({ where }),
  ]);

  res.json({
    data: plans,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
};

// ─── Get single ───────────────────────────────────────────────────────────────

export const getPlan = async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = req.user;
  const userHasTherapistCert = user?.approvedCertificates?.includes('THERAPIST' as any);

  const plan = await prisma.therapyPlan.findUnique({
    where: { id },
    include: THERAPIST_PLAN_INCLUDE,
  });
  if (!plan) return res.status(404).json({ message: 'Plan not found' });

  // Visibility rules
  const publicStatuses = new Set(['PUBLISHED', 'SIGN_UP_CLOSED', 'IN_PROGRESS', 'FINISHED', 'IN_GALLERY']);
  if (!publicStatuses.has(plan.status)) {
    if (!user) return res.status(404).json({ message: 'Plan not found' });
    if (user.role === 'MEMBER' && !userHasTherapistCert) return res.status(404).json({ message: 'Plan not found' });
    if (user.role === 'MEMBER' && userHasTherapistCert) {
      if (plan.userProfile?.userId !== user.id) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }
    // ADMINs can see any plan
  }

  res.json(plan);
};

// ─── Update ───────────────────────────────────────────────────────────────────

export const updatePlan = async (req: Request, res: Response) => {
  const { id } = req.params;
  const body = req.body as UpdateTherapyPlanInput;
  const user = req.user!;
  const userHasTherapistCert = user.approvedCertificates?.includes('THERAPIST' as any);

  const plan = await prisma.therapyPlan.findUnique({
    where: { id },
    include: { userProfile: true },
  });
  if (!plan) return res.status(404).json({ message: 'Plan not found' });

  if (user.role === 'MEMBER' && userHasTherapistCert) {
    if (plan.userProfile?.userId !== user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const editableStatuses = ['DRAFT', 'REJECTED', 'IN_GALLERY'];
    if (!editableStatuses.includes(plan.status)) {
      return res.status(400).json({ message: 'Only DRAFT, REJECTED, or IN_GALLERY plans can be edited' });
    }
  }

  const updated = await prisma.therapyPlan.update({
    where: { id },
    data: {
      ...(body.type !== undefined ? { type: body.type } : {}),
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.slogan !== undefined ? { slogan: body.slogan } : {}),
      ...(body.introduction !== undefined ? { introduction: body.introduction } : {}),
      ...(body.startTime !== undefined ? { startTime: new Date(body.startTime) } : {}),
      ...(body.endTime !== undefined ? { endTime: body.endTime ? new Date(body.endTime) : null } : {}),
      ...(body.location !== undefined ? { location: body.location } : {}),
      ...(body.maxParticipants !== undefined ? { maxParticipants: body.maxParticipants } : {}),
      ...(body.contactInfo !== undefined ? { contactInfo: body.contactInfo } : {}),
      ...('price' in body ? { price: (body as any).price != null ? (body as any).price : null } : {}),
      ...(body.artSalonSubType !== undefined ? { artSalonSubType: body.artSalonSubType } : {}),
      ...(body.sessionMedium !== undefined ? { sessionMedium: body.sessionMedium } : {}),
      ...(body.defaultPosterId !== undefined ? { defaultPosterId: body.defaultPosterId, posterUrl: null } : {}),
      ...(body.posterUrl !== undefined ? { posterUrl: body.posterUrl, defaultPosterId: null } : {}),
    },
    include: THERAPIST_PLAN_INCLUDE,
  });

  res.json(updated);
};

// ─── Submit for review ───────────────────────────────────────────────────────

// ─── Conflict detection helper ────────────────────────────────────────────────

const CONFLICT_PLAN_STATUSES = ['PUBLISHED', 'SIGN_UP_CLOSED', 'IN_PROGRESS'] as const;

const checkPlanConflicts = async (
  userProfileId: string,
  startTime: Date,
  endTime: Date | null,
  excludePlanId?: string,
) => {
  const slotEnd = endTime ?? startTime; // if no endTime, treat as point in time

  // Appointment.endTime is non-nullable, so no null branch needed
  const apptOverlapsClause = {
    AND: [
      { startTime: { lt: slotEnd } },
      { endTime: { gt: startTime } },
    ],
  };

  // TherapyPlan.endTime is nullable, so also check for null (no end = still active)
  const planOverlapsClause = {
    AND: [
      { startTime: { lt: slotEnd } },
      {
        OR: [
          { endTime: null },
          { endTime: { gt: startTime } },
        ],
      },
    ],
  };

  const [conflictingAppointments, conflictingPlans] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        userProfileId,
        status: { in: ['CONFIRMED', 'IN_PROGRESS'] as any },
        ...apptOverlapsClause,
      },
      select: { id: true, startTime: true, endTime: true },
    }),
    prisma.therapyPlan.findMany({
      where: {
        userProfileId,
        status: { in: CONFLICT_PLAN_STATUSES as any },
        id: excludePlanId ? { not: excludePlanId } : undefined,
        ...planOverlapsClause,
      },
      select: { id: true, title: true, startTime: true, type: true },
    }),
  ]);

  const conflicts = [
    ...conflictingAppointments.map((a) => ({
      type: 'appointment' as const,
      id: a.id,
      startTime: a.startTime,
    })),
    ...conflictingPlans.map((p) => ({
      type: 'plan' as const,
      id: p.id,
      title: p.title,
      startTime: p.startTime,
    })),
  ];

  if (conflicts.length > 0) {
    logToFile(`[ConflictDetection] Conflicts found for therapist ${userProfileId}: ${JSON.stringify(conflicts)}`);
  } else {
    logToFile(`[ConflictDetection] No conflicts found for therapist ${userProfileId}`);
  }

  return { hasConflict: conflicts.length > 0, conflicts };
};

// ─── Submit for review ───────────────────────────────────────────────────────

export const submitForReview = async (req: Request, res: Response) => {
  const { id } = req.params;

  const plan = await prisma.therapyPlan.findUnique({
    where: { id },
    include: { userProfile: { include: { user: true } } },
  });
  if (!plan) return res.status(404).json({ message: 'Plan not found' });
  if (plan.userProfile?.userId !== req.user!.id) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  if (plan.status !== 'DRAFT' && plan.status !== 'REJECTED') {
    return res.status(400).json({ message: 'Only DRAFT or REJECTED plans can be submitted for review' });
  }

  const { hasConflict, conflicts } = await checkPlanConflicts(
    plan.userProfileId ?? "",
    plan.startTime,
    plan.endTime ?? null,
    id,
  );
  if (hasConflict) {
    const detail = conflicts.map(c => c.type === 'plan' ? `Plan: "${c.title}"` : `Appointment at ${new Date(c.startTime).toLocaleTimeString()}`).join(', ');
    logToFile(`[TherapyPlanController] Submit blocked by conflict for plan ${id}: ${detail}`);
    return res.status(409).json({ message: `Schedule conflict detected: ${detail}` });
  }

  const updated = await prisma.therapyPlan.update({
    where: { id },
    data: { status: 'PENDING_REVIEW', submittedAt: new Date() },
    include: THERAPIST_PLAN_INCLUDE,
  });

  const therapistName = `${plan.userProfile?.user?.firstName} ${plan.userProfile?.user?.lastName}`;
  await notifyAdminsOnPlanSubmitted(plan.id, plan.title, therapistName);

  res.json(updated);
};

// ─── Review (Admin: approve or reject) ───────────────────────────────────────

export const reviewPlan = async (req: Request, res: Response) => {
  const { id } = req.params;
  const body = req.body as ReviewTherapyPlanInput;

  const plan = await prisma.therapyPlan.findUnique({
    where: { id },
    include: { userProfile: { include: { user: true } } },
  });
  if (!plan) return res.status(404).json({ message: 'Plan not found' });
  if (plan.status !== 'PENDING_REVIEW') {
    return res.status(400).json({ message: 'Only PENDING_REVIEW plans can be reviewed' });
  }

  if (body.action === 'APPROVE') {
    const updated = await prisma.therapyPlan.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
        reviewedAt: new Date(),
        rejectionReason: null,
      },
      include: THERAPIST_PLAN_INCLUDE,
    });

    await notifyAllClientsOnPlanPublished(plan.id, plan.title);
    return res.json(updated);
  }

  // REJECT
  const updated = await prisma.therapyPlan.update({
    where: { id },
    data: {
      status: 'REJECTED',
      rejectionReason: body.rejectionReason!,
      reviewedAt: new Date(),
    },
    include: THERAPIST_PLAN_INCLUDE,
  });

  const ownerUserId = plan.userProfile?.userId;
  if (!ownerUserId) return res.status(400).json({ message: 'Plan owner not found' });

  await notifyTherapistOnRejection(
    ownerUserId,
    plan.id,
    plan.title,
    body.rejectionReason!,
  );

  res.json(updated);
};

// ─── Archive ──────────────────────────────────────────────────────────────────

export const archivePlan = async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = req.user!;

  const plan = await prisma.therapyPlan.findUnique({
    where: { id },
    include: { userProfile: true },
  });
  if (!plan) return res.status(404).json({ message: 'Plan not found' });
  if (plan.status !== 'PUBLISHED') {
    return res.status(400).json({ message: 'Only PUBLISHED plans can be archived' });
  }
  if (user.role === 'MEMBER' && plan.userProfile?.userId !== user.id) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const updated = await prisma.therapyPlan.update({
    where: { id },
    data: { status: 'ARCHIVED' },
    include: THERAPIST_PLAN_INCLUDE,
  });

  res.json(updated);
};

// ─── Delete ───────────────────────────────────────────────────────────────────

export const deletePlan = async (req: Request, res: Response) => {
  const { id } = req.params;

  const plan = await prisma.therapyPlan.findUnique({
    where: { id },
    include: { userProfile: true },
  });
  if (!plan) return res.status(404).json({ message: 'Plan not found' });
  if (plan.userProfile?.userId !== req.user!.id) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  if (plan.status !== 'DRAFT' && plan.status !== 'CANCELLED') {
    return res.status(400).json({ message: 'Only DRAFT or CANCELLED plans can be deleted' });
  }

  // Cleanup all media before deleting from DB
  await deleteAsset(plan.posterUrl);
  await deleteAsset(plan.videoUrl);
  await deleteAsset(plan.attachmentUrl);

  const images = await prisma.therapyPlanImage.findMany({ where: { planId: id } });
  for (const img of images) {
    await deleteAsset(img.url);
  }

  const pdfs = await prisma.therapyPlanPdf.findMany({ where: { planId: id } });
  for (const pdf of pdfs) {
    await deleteAsset(pdf.url);
  }

  await prisma.therapyPlan.delete({ where: { id } });
  res.status(204).send();
};

// ─── Upload custom poster ─────────────────────────────────────────────────────

export const uploadPlanPoster = async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = req.user!;
  const file = (req as any).file as Express.Multer.File | undefined;

  if (!file) return res.status(400).json({ message: 'No file uploaded' });

  const plan = await prisma.therapyPlan.findUnique({
    where: { id },
    include: { userProfile: true },
  });
  if (!plan) return res.status(404).json({ message: 'Plan not found' });
  if (user.role === 'MEMBER' && plan.userProfile?.userId !== user.id) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const posterUrl = await uploadAsset(file.buffer, 'poster', id);
  const oldUrl = plan.posterUrl;
  await prisma.therapyPlan.update({ where: { id }, data: { posterUrl, defaultPosterId: null } });

  if (oldUrl && oldUrl !== posterUrl) {
    await deleteAsset(oldUrl);
  }

  res.json({ posterUrl });
};

// ─── Upload plan video ────────────────────────────────────────────────────────

export const uploadPlanVideo = async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = req.user!;
  const file = (req as any).file as Express.Multer.File | undefined;

  if (!file) return res.status(400).json({ message: 'No file uploaded' });

  const plan = await prisma.therapyPlan.findUnique({
    where: { id },
    include: { userProfile: true },
  });
  if (!plan) return res.status(404).json({ message: 'Plan not found' });
  if (user.role === 'MEMBER' && plan.userProfile?.userId !== user.id) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const videoUrl = await uploadAsset(file.buffer, 'video', id);
  const oldUrl = plan.videoUrl;
  await prisma.therapyPlan.update({ where: { id }, data: { videoUrl } });

  if (oldUrl && oldUrl !== videoUrl) {
    await deleteAsset(oldUrl);
  }

  res.json({ videoUrl });
};

// ─── Gallery image management ─────────────────────────────────────────────────

export const addPlanImage = async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = req.user!;
  const file = (req as any).file as Express.Multer.File | undefined;

  logToFile(`[TherapyPlanController] addPlanImage started for plan: ${id}`);

  if (!file) {
    logToFile(`[TherapyPlanController] No file provided`);
    return res.status(400).json({ message: 'No file uploaded' });
  }

  try {
    const plan = await prisma.therapyPlan.findUnique({
      where: { id },
      include: { userProfile: true, images: true },
    });
    if (!plan) {
      logToFile(`[TherapyPlanController] Plan ${id} not found`);
      return res.status(404).json({ message: 'Plan not found' });
    }
    if (user.role === 'MEMBER' && plan.userProfile?.userId !== user.id) {
      logToFile(`[TherapyPlanController] User ${user.id} Forbidden for plan ${id}`);
      return res.status(403).json({ message: 'Forbidden' });
    }
    if (plan.images.length >= 9) {
      logToFile(`[TherapyPlanController] Already have 9 images for plan ${id}`);
      return res.status(400).json({ message: 'Maximum of 9 gallery images allowed' });
    }

    // Create a placeholder record to get the ID for the filename
    const imageRecord = await prisma.therapyPlanImage.create({
      data: { planId: id, url: '', order: plan.images.length },
    });
    logToFile(`[TherapyPlanController] Created placeholder record: ${imageRecord.id}`);

    let url: string;
    try {
      url = await uploadAsset(file.buffer, 'plan-image', imageRecord.id);
      logToFile(`[TherapyPlanController] Upload service returned URL: ${url}`);
    } catch (err: any) {
      logToFile(`[TherapyPlanController] Upload service failed: ${err.message}`);
      // Clean up the placeholder on upload failure
      await prisma.therapyPlanImage.delete({ where: { id: imageRecord.id } }).catch((cleanupErr) => {
        logToFile(`[TherapyPlanController] Cleanup failed: ${cleanupErr.message}`);
      });
      return res.status(500).json({ message: 'Image upload failed. Please try again.' });
    }

    const updated = await prisma.therapyPlanImage.update({
      where: { id: imageRecord.id },
      data: { url },
    });
    logToFile(`[TherapyPlanController] Updated record ${imageRecord.id} with final URL`);

    res.status(201).json({ image: updated });
  } catch (error: any) {
    logToFile(`[TherapyPlanController] Global error in addPlanImage: ${error.message}`);
    res.status(500).json({ message: 'Internal server error during upload.' });
  }
};

export const deletePlanImage = async (req: Request, res: Response) => {
  const { id, imageId } = req.params;
  const user = req.user!;

  const image = await prisma.therapyPlanImage.findUnique({
    where: { id: imageId },
    include: { plan: { include: { userProfile: true } } },
  });
  if (!image || image.planId !== id) return res.status(404).json({ message: 'Image not found' });
  if (user.role === 'MEMBER' && image.plan.userProfile?.userId !== user.id) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  await deleteAsset(image.url);
  await prisma.therapyPlanImage.delete({ where: { id: imageId } });

  res.status(204).send();
};

export const reorderPlanImages = async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = req.user!;
  const { order } = req.body as { order: string[] };

  if (!Array.isArray(order)) return res.status(400).json({ message: 'order must be an array of image IDs' });

  const plan = await prisma.therapyPlan.findUnique({
    where: { id },
    include: { userProfile: true, images: true },
  });
  if (!plan) return res.status(404).json({ message: 'Plan not found' });
  if (user.role === 'MEMBER' && plan.userProfile?.userId !== user.id) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const planImageIds = new Set(plan.images.map((img) => img.id));
  if (!order.every((imgId) => planImageIds.has(imgId))) {
    return res.status(400).json({ message: 'Invalid image IDs in order array' });
  }

  await prisma.$transaction(
    order.map((imgId, idx) =>
      prisma.therapyPlanImage.update({ where: { id: imgId }, data: { order: idx } })
    )
  );

  res.status(200).json({ message: 'Order updated' });
};

// ─── PDF attachment management ────────────────────────────────────────────────

export const addPlanPdf = async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = req.user!;
  const file = (req as any).file as Express.Multer.File | undefined;

  logToFile(`[TherapyPlanController] addPlanPdf started for plan: ${id}`);

  if (!file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  try {
    const plan = await prisma.therapyPlan.findUnique({
      where: { id },
      include: { userProfile: true, pdfs: true },
    });
    if (!plan) return res.status(404).json({ message: 'Plan not found' });
    if (user.role === 'MEMBER' && plan.userProfile?.userId !== user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    if (plan.pdfs.length >= 6) {
      return res.status(400).json({ message: 'Maximum of 6 PDF attachments allowed' });
    }

    const pdfRecord = await prisma.therapyPlanPdf.create({
      data: { planId: id, url: '', name: file.originalname, order: plan.pdfs.length },
    });

    let url: string;
    try {
      url = await uploadAsset(file.buffer, 'plan-pdf', pdfRecord.id);
    } catch (err: any) {
      await prisma.therapyPlanPdf.delete({ where: { id: pdfRecord.id } }).catch(() => { });
      return res.status(500).json({ message: 'PDF upload failed. Please try again.' });
    }

    const updated = await prisma.therapyPlanPdf.update({
      where: { id: pdfRecord.id },
      data: { url },
    });

    res.status(201).json({ pdf: updated });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error during upload.' });
  }
};

export const deletePlanPdf = async (req: Request, res: Response) => {
  const { id, pdfId } = req.params;
  const user = req.user!;

  const pdf = await prisma.therapyPlanPdf.findUnique({
    where: { id: pdfId },
    include: { plan: { include: { userProfile: true } } },
  });
  if (!pdf || pdf.planId !== id) return res.status(404).json({ message: 'PDF not found' });
  if (user.role === 'MEMBER' && pdf.plan.userProfile?.userId !== user.id) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  await deleteAsset(pdf.url);
  await prisma.therapyPlanPdf.delete({ where: { id: pdfId } });

  res.status(204).send();
};

export const reorderPlanPdfs = async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = req.user!;
  const { order } = req.body as { order: string[] };

  if (!Array.isArray(order)) return res.status(400).json({ message: 'order must be an array of PDF IDs' });

  const plan = await prisma.therapyPlan.findUnique({
    where: { id },
    include: { userProfile: true, pdfs: true },
  });
  if (!plan) return res.status(404).json({ message: 'Plan not found' });
  if (user.role === 'MEMBER' && plan.userProfile?.userId !== user.id) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const planPdfIds = new Set(plan.pdfs.map((p: any) => p.id));
  if (!order.every((pdfId) => planPdfIds.has(pdfId))) {
    return res.status(400).json({ message: 'Invalid PDF IDs in order array' });
  }

  await prisma.$transaction(
    order.map((pdfId, idx) =>
      prisma.therapyPlanPdf.update({ where: { id: pdfId }, data: { order: idx } })
    )
  );

  res.status(200).json({ message: 'Order updated' });
};

// ─── Upsert plan events ───────────────────────────────────────────────────────

export const upsertPlanEvents = async (req: Request, res: Response) => {
  const { id } = req.params;
  const body = req.body as UpsertPlanEventsInput;
  const user = req.user!;

  const plan = await prisma.therapyPlan.findUnique({
    where: { id },
    include: { userProfile: true },
  });
  if (!plan) return res.status(404).json({ message: 'Plan not found' });

  if (user.role === 'MEMBER') {
    if (plan.userProfile?.userId !== user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    if (plan.status !== 'DRAFT' && plan.status !== 'REJECTED') {
      return res.status(400).json({
        message: 'Events can only be edited on DRAFT or REJECTED plans',
      });
    }
  }

  // Replace all events atomically, then mirror the first event's times back to
  // plan.startTime / plan.endTime so timeFilter queries remain consistent.
  const sorted = [...body.events].sort((a, b) => a.order - b.order);
  const first = sorted[0];

  await prisma.$transaction([
    prisma.therapyPlanEvent.deleteMany({ where: { planId: id } }),
    ...body.events.map((evt, idx) =>
      prisma.therapyPlanEvent.create({
        data: {
          planId: id,
          startTime: new Date(evt.startTime),
          endTime: evt.endTime ? new Date(evt.endTime) : null,
          title: evt.title ?? null,
          isAvailable: evt.isAvailable,
          order: evt.order ?? idx,
        },
      }),
    ),
    prisma.therapyPlan.update({
      where: { id },
      data: {
        startTime: new Date(first.startTime),
        endTime: first.endTime ? new Date(first.endTime) : null,
      },
    }),
  ]);

  const updated = await prisma.therapyPlan.findUnique({
    where: { id },
    include: THERAPIST_PLAN_INCLUDE,
  });
  res.json(updated);
};

// ─── Export plan schedule as iCalendar (.ics) ─────────────────────────────────

export const exportPlanIcs = async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = req.user;

  const plan = await prisma.therapyPlan.findUnique({
    where: { id },
    include: THERAPIST_PLAN_INCLUDE,
  });
  if (!plan) return res.status(404).json({ message: 'Plan not found' });

  // Visibility: only PUBLISHED plans are public; others require owner or admin
  if (plan.status !== 'PUBLISHED') {
    if (!user) return res.status(404).json({ message: 'Plan not found' });
    const userHasTherapistCert = user.approvedCertificates?.includes('THERAPIST' as any);
    if (user.role === 'MEMBER' && !userHasTherapistCert) return res.status(404).json({ message: 'Plan not found' });
    if (user.role === 'MEMBER' && userHasTherapistCert && plan.userProfile?.userId !== user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }
  }

  const dtstamp = new Date();
  const therapistUser = plan.userProfile?.user;
  const organizerName = therapistUser
    ? `${therapistUser.firstName} ${therapistUser.lastName}`
    : undefined;

  // Use plan.events if present, otherwise fall back to plan-level startTime/endTime
  const sourceEvents =
    plan.events.length > 0
      ? plan.events
      : [
        {
          id: `${plan.id}-default`,
          startTime: plan.startTime,
          endTime: plan.endTime ?? null,
          title: null,
          isAvailable: true,
        },
      ];

  const icsEvents: IcsEvent[] = [];
  for (const evt of sourceEvents) {
    // For PERSONAL_CONSULT, skip unavailable slots in the export
    if (plan.type === 'PERSONAL_CONSULT' && !evt.isAvailable) continue;

    icsEvents.push({
      uid: `${evt.id}@luyin.xyz`,
      summary: evt.title ? `${plan.title} �?${evt.title}` : plan.title,
      description: plan.introduction,
      location: plan.location,
      dtstart: new Date(evt.startTime),
      dtend: evt.endTime ? new Date(evt.endTime) : undefined,
      dtstamp,
      organizer: organizerName,
    });
  }

  if (icsEvents.length === 0) {
    return res.status(404).json({ message: 'No exportable events for this plan' });
  }

  const icsContent = buildIcsCalendar(plan.title, icsEvents);
  const safeTitle = plan.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();

  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.ics"`);
  res.send(icsContent);
};

// ─── Lifecycle helpers ────────────────────────────────────────────────────────

const requirePlanOwner = async (id: string, userId: string, allowAdmin = true) => {
  const plan = await prisma.therapyPlan.findUnique({
    where: { id },
    include: { userProfile: { include: { user: true } } },
  });
  return plan;
};

// ─── Close sign-ups ───────────────────────────────────────────────────────────

export const closeSignup = async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = req.user!;

  const plan = await prisma.therapyPlan.findUnique({
    where: { id },
    include: { userProfile: true },
  });
  if (!plan) return res.status(404).json({ message: 'Plan not found' });
  if (plan.userProfile?.userId !== user.id) return res.status(403).json({ message: 'Forbidden' });
  if (plan.status !== 'PUBLISHED') {
    return res.status(400).json({ message: 'Plan must be PUBLISHED to close sign-ups' });
  }

  const updated = await prisma.therapyPlan.update({
    where: { id },
    data: { status: 'SIGN_UP_CLOSED' as any },
    include: THERAPIST_PLAN_INCLUDE,
  });
  res.json(updated);
};

// ─── Start plan ───────────────────────────────────────────────────────────────

export const startPlan = async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = req.user!;

  const plan = await prisma.therapyPlan.findUnique({
    where: { id },
    include: {
      userProfile: true,
      participants: {
        where: { status: 'SIGNED_UP' as any },
        include: { user: { select: { id: true } } },
      },
    },
  });
  if (!plan) return res.status(404).json({ message: 'Plan not found' });
  if (plan.userProfile?.userId !== user.id) return res.status(403).json({ message: 'Forbidden' });
  if (plan.status !== 'SIGN_UP_CLOSED') {
    return res.status(400).json({ message: 'Sign-ups must be closed before starting the plan' });
  }

  const updated = await prisma.therapyPlan.update({
    where: { id },
    data: { status: 'IN_PROGRESS' as any },
    include: THERAPIST_PLAN_INCLUDE,
  });

  const participantUserIds = plan.participants.map((p: any) => p.user.id);
  await notifyParticipantsPlanStarted(id, plan.title, participantUserIds);

  res.json(updated);
};

// ─── Finish plan ──────────────────────────────────────────────────────────────

export const finishPlan = async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = req.user!;

  const plan = await prisma.therapyPlan.findUnique({
    where: { id },
    include: { userProfile: true },
  });
  if (!plan) return res.status(404).json({ message: 'Plan not found' });
  if (plan.userProfile?.userId !== user.id) return res.status(403).json({ message: 'Forbidden' });
  if (plan.status !== 'IN_PROGRESS') {
    return res.status(400).json({ message: 'Plan must be IN_PROGRESS to finish' });
  }

  const updated = await prisma.therapyPlan.update({
    where: { id },
    data: { status: 'FINISHED' as any },
    include: THERAPIST_PLAN_INCLUDE,
  });
  res.json(updated);
};

// ─── Move to gallery ──────────────────────────────────────────────────────────

export const movePlanToGallery = async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = req.user!;

  const plan = await prisma.therapyPlan.findUnique({
    where: { id },
    include: { userProfile: true },
  });
  if (!plan) return res.status(404).json({ message: 'Plan not found' });
  if (plan.userProfile?.userId !== user.id) return res.status(403).json({ message: 'Forbidden' });
  if (plan.status !== 'FINISHED') {
    return res.status(400).json({ message: 'Plan must be FINISHED to move to gallery' });
  }

  const updated = await prisma.therapyPlan.update({
    where: { id },
    data: { status: 'IN_GALLERY' as any },
    include: THERAPIST_PLAN_INCLUDE,
  });
  res.json(updated);
};

// ─── Cancel plan (therapist or admin) ────────────────────────────────────────

export const cancelPlan = async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = req.user!;

  const plan = await prisma.therapyPlan.findUnique({
    where: { id },
    include: {
      userProfile: { include: { user: { select: { id: true } } } },
      participants: {
        where: { status: 'SIGNED_UP' as any },
        include: { user: { select: { id: true } } },
      },
    },
  });
  if (!plan) return res.status(404).json({ message: 'Plan not found' });

  const isOwner = plan.userProfile?.userId === user.id;
  if (!isOwner && user.role !== 'ADMIN') return res.status(403).json({ message: 'Forbidden' });

  const cancellableStatuses = ['PUBLISHED', 'SIGN_UP_CLOSED', 'IN_PROGRESS'];
  if (!cancellableStatuses.includes(plan.status)) {
    return res.status(400).json({ message: 'Plan cannot be cancelled in its current status' });
  }

  const participantUserIds = plan.participants.map((p: any) => p.user.id);
  const participantIds = plan.participants.map((p: any) => p.id);

  // Cancel all participants and attempt refunds
  await Promise.all([
    prisma.therapyPlanParticipant.updateMany({
      where: { id: { in: participantIds } },
      data: { status: 'CANCELLED' as any },
    }),
    ...participantIds.map((pid: string) => refundPlanPayment(pid, true)),
  ]);

  const updated = await prisma.therapyPlan.update({
    where: { id },
    data: { status: 'CANCELLED' as any },
    include: THERAPIST_PLAN_INCLUDE,
  });

  await notifyParticipantsPlanCancelled(id, plan.title, participantUserIds);

  res.json(updated);
};

// ─── Sign up for plan (client) ────────────────────────────────────────────────

export const signUpForPlan = async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = req.user!;

  const plan = await prisma.therapyPlan.findUnique({
    where: { id },
    include: {
      userProfile: { include: { user: { select: { id: true } } } },
      _count: { select: { participants: { where: { status: 'SIGNED_UP' as any } } } },
    },
  });
  if (!plan) return res.status(404).json({ message: 'Plan not found' });
  if (plan.status !== 'PUBLISHED') {
    return res.status(400).json({ message: 'Sign-ups are not open for this plan' });
  }
  if (plan.type === 'PERSONAL_CONSULT') {
    return res.status(400).json({ message: 'Personal consultations are booked via appointments' });
  }

  // Check 12 hours deadline
  const now = new Date();
  const deadline = new Date(plan.startTime).getTime() - 12 * 60 * 60 * 1000;
  if (now.getTime() > deadline) {
    return res.status(400).json({ message: 'Sign-ups are closed 12 hours before the plan starts' });
  }

  // Check capacity
  if (plan.maxParticipants !== null && (plan._count as any).participants >= plan.maxParticipants) {
    return res.status(400).json({ message: 'This plan is fully booked' });
  }

  // Check not already signed up
  const existing = await prisma.therapyPlanParticipant.findUnique({
    where: { userId_planId: { userId: user.id, planId: id } },
  });
  if (existing && existing.status === ('SIGNED_UP' as any)) {
    return res.status(409).json({ message: 'Already signed up for this plan' });
  }

  // Determine initial status: if paid, PENDING_PAYMENT. If free, SIGNED_UP.
  const initialStatus = (plan.price !== null && Number(plan.price) > 0)
    ? 'PENDING_PAYMENT'
    : 'SIGNED_UP';

  // Create or re-activate participant
  const participant = existing
    ? await prisma.therapyPlanParticipant.update({
      where: { id: existing.id },
      data: { status: initialStatus as any, enrolledAt: new Date() },
    })
    : await prisma.therapyPlanParticipant.create({
      data: { userId: user.id, planId: id, status: initialStatus as any },
    });

  // Create pending payment record if plan has a price
  let payment = null;
  if (plan.price !== null && Number(plan.price) > 0) {
    const amountCents = Math.round(Number(plan.price) * 100);
    const platformFee = Math.round(amountCents * 0.1);
    payment = await prisma.planPayment.create({
      data: {
        participantId: participant.id,
        provider: (req.body?.paymentProvider ?? 'ALIPAY') as any,
        amount: amountCents,
        currency: 'cny',
        platformFeeAmount: platformFee,
        therapistPayoutAmount: amountCents - platformFee,
        status: 'PENDING',
      },
    });
  }

  const clientName = `${(req as any).userFullName ?? user.id}`;
  const signupOwnerUserId = plan.userProfile?.userId;
  if (!signupOwnerUserId) return res.status(400).json({ message: 'Plan owner not found' });
  await notifyTherapistOnSignup(signupOwnerUserId, id, plan.title, clientName);

  res.status(201).json({ participant, payment });
};

export const getSignupStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = req.user!;

  const participant = await prisma.therapyPlanParticipant.findUnique({
    where: { userId_planId: { userId: user.id, planId: id } },
    include: { payment: true },
  });

  if (!participant) return res.status(404).json({ message: 'Sign-up not found' });
  res.json({ participant, payment: participant.payment });
};

// ─── Cancel sign-up (client) ──────────────────────────────────────────────────

export const cancelSignup = async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = req.user!;

  const participant = await prisma.therapyPlanParticipant.findUnique({
    where: { userId_planId: { userId: user.id, planId: id } },
    include: {
      plan: { include: { userProfile: { include: { user: { select: { id: true } } } } } },
    },
  });
  if (!participant || participant.status !== ('SIGNED_UP' as any)) {
    return res.status(404).json({ message: 'Sign-up not found' });
  }
  if (participant.plan.status !== 'PUBLISHED') {
    return res.status(400).json({ message: 'Sign-ups can only be cancelled while sign-ups are open' });
  }

  await prisma.therapyPlanParticipant.update({
    where: { id: participant.id },
    data: { status: 'CANCELLED' as any },
  });

  await refundPlanPayment(participant.id, false);

  const clientName = `${(req as any).userFullName ?? user.id}`;
  const cancelOwnerUserId = participant.plan.userProfile?.userId;
  if (!cancelOwnerUserId) return res.status(400).json({ message: 'Plan owner not found' });
  await notifyTherapistOnSignupCancelled(
    cancelOwnerUserId,
    id,
    participant.plan.title,
    clientName,
  );

  res.status(204).send();
};

export const getPendingPlans = async (req: Request, res: Response) => {
  const plans = await prisma.therapyPlan.findMany({
    where: { status: 'PENDING_REVIEW' },
    include: THERAPIST_PLAN_INCLUDE,
    orderBy: { submittedAt: 'asc' },
  });
  res.json({ data: plans });
};


