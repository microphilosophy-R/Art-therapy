import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { uploadPoster } from '../services/upload.service';
import {
  notifyAdminsOnPlanSubmitted,
  notifyAllClientsOnPlanPublished,
  notifyTherapistOnRejection,
} from '../services/message.service';
import type {
  CreateTherapyPlanInput,
  UpdateTherapyPlanInput,
  ReviewTherapyPlanInput,
  ListTherapyPlansQuery,
} from '../schemas/therapyPlan.schemas';

const THERAPIST_PLAN_INCLUDE = {
  therapist: {
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
} satisfies Prisma.TherapyPlanInclude;

// ─── Create ──────────────────────────────────────────────────────────────────

export const createPlan = async (req: Request, res: Response) => {
  const body = req.body as CreateTherapyPlanInput;

  const therapistProfile = await prisma.therapistProfile.findUnique({
    where: { userId: req.user!.id },
  });
  if (!therapistProfile) {
    return res.status(404).json({ message: 'Therapist profile not found' });
  }

  const plan = await prisma.therapyPlan.create({
    data: {
      therapistId: therapistProfile.id,
      type: body.type,
      title: body.title,
      slogan: body.slogan ?? null,
      introduction: body.introduction,
      startTime: new Date(body.startTime),
      endTime: body.endTime ? new Date(body.endTime) : null,
      location: body.location,
      maxParticipants: body.maxParticipants ?? null,
      contactInfo: body.contactInfo,
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

  let where: any = {};

  if (!user || user.role === 'CLIENT') {
    // Public and clients see only published plans
    where = { status: 'PUBLISHED' };
  } else if (user.role === 'THERAPIST') {
    // Therapists see only their own plans (all statuses)
    const profile = await prisma.therapistProfile.findUnique({ where: { userId: user.id } });
    if (!profile) return res.status(404).json({ message: 'Therapist profile not found' });
    where = { therapistId: profile.id };
  } else if (user.role === 'ADMIN') {
    // Admins see everything; optionally filter by status or type
    if (query.status) where.status = query.status;
  }

  if (query.type) where.type = query.type;

  const now = new Date();
  if (query.timeFilter === 'past') {
    where.OR = [
      { endTime: { lt: now } },
      { AND: [{ endTime: null }, { startTime: { lt: now } }] },
    ];
  } else if (query.timeFilter === 'upcoming') {
    where.OR = [
      { endTime: { gte: now } },
      { AND: [{ endTime: null }, { startTime: { gte: now } }] },
    ];
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

  const plan = await prisma.therapyPlan.findUnique({
    where: { id },
    include: THERAPIST_PLAN_INCLUDE,
  });
  if (!plan) return res.status(404).json({ message: 'Plan not found' });

  // Visibility rules
  if (plan.status !== 'PUBLISHED') {
    if (!user) return res.status(404).json({ message: 'Plan not found' });
    if (user.role === 'CLIENT') return res.status(404).json({ message: 'Plan not found' });
    if (user.role === 'THERAPIST') {
      // Therapist can only see their own non-published plans
      if (plan.therapist.userId !== user.id) {
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

  const plan = await prisma.therapyPlan.findUnique({
    where: { id },
    include: { therapist: true },
  });
  if (!plan) return res.status(404).json({ message: 'Plan not found' });

  if (user.role === 'THERAPIST') {
    if (plan.therapist.userId !== user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    if (plan.status !== 'DRAFT' && plan.status !== 'REJECTED') {
      return res.status(400).json({ message: 'Only DRAFT or REJECTED plans can be edited' });
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

export const submitForReview = async (req: Request, res: Response) => {
  const { id } = req.params;

  const plan = await prisma.therapyPlan.findUnique({
    where: { id },
    include: { therapist: { include: { user: true } } },
  });
  if (!plan) return res.status(404).json({ message: 'Plan not found' });
  if (plan.therapist.userId !== req.user!.id) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  if (plan.status !== 'DRAFT' && plan.status !== 'REJECTED') {
    return res.status(400).json({ message: 'Only DRAFT or REJECTED plans can be submitted for review' });
  }

  const updated = await prisma.therapyPlan.update({
    where: { id },
    data: { status: 'PENDING_REVIEW', submittedAt: new Date() },
    include: THERAPIST_PLAN_INCLUDE,
  });

  const therapistName = `${plan.therapist.user.firstName} ${plan.therapist.user.lastName}`;
  await notifyAdminsOnPlanSubmitted(plan.id, plan.title, therapistName);

  res.json(updated);
};

// ─── Review (Admin: approve or reject) ───────────────────────────────────────

export const reviewPlan = async (req: Request, res: Response) => {
  const { id } = req.params;
  const body = req.body as ReviewTherapyPlanInput;

  const plan = await prisma.therapyPlan.findUnique({
    where: { id },
    include: { therapist: { include: { user: true } } },
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

  await notifyTherapistOnRejection(
    plan.therapist.userId,
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
    include: { therapist: true },
  });
  if (!plan) return res.status(404).json({ message: 'Plan not found' });
  if (plan.status !== 'PUBLISHED') {
    return res.status(400).json({ message: 'Only PUBLISHED plans can be archived' });
  }
  if (user.role === 'THERAPIST' && plan.therapist.userId !== user.id) {
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
    include: { therapist: true },
  });
  if (!plan) return res.status(404).json({ message: 'Plan not found' });
  if (plan.therapist.userId !== req.user!.id) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  if (plan.status !== 'DRAFT') {
    return res.status(400).json({ message: 'Only DRAFT plans can be deleted' });
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
    include: { therapist: true },
  });
  if (!plan) return res.status(404).json({ message: 'Plan not found' });
  if (user.role === 'THERAPIST' && plan.therapist.userId !== user.id) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const posterUrl = await uploadPoster(file.buffer, id);

  await prisma.therapyPlan.update({
    where: { id },
    data: { posterUrl, defaultPosterId: null },
  });

  res.json({ posterUrl });
};
