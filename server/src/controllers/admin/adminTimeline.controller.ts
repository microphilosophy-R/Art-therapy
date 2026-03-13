import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';

type ReviewTimelineType = 'plans' | 'products' | 'certificates';

const defaultTimelineWindow = () => {
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - 30);
  const to = new Date(now);
  to.setDate(to.getDate() + 90);
  return { from, to };
};

const parseRange = (fromRaw?: string, toRaw?: string) => {
  const { from: defaultFrom, to: defaultTo } = defaultTimelineWindow();
  const from = fromRaw ? new Date(fromRaw) : defaultFrom;
  const to = toRaw ? new Date(toRaw) : defaultTo;
  const safeFrom = Number.isNaN(from.getTime()) ? defaultFrom : from;
  const safeTo = Number.isNaN(to.getTime()) ? defaultTo : to;
  return safeFrom <= safeTo ? { from: safeFrom, to: safeTo } : { from: safeTo, to: safeFrom };
};

export const getReviewTimeline = async (req: Request, res: Response) => {
  const { from, to } = parseRange(
    typeof req.query.from === 'string' ? req.query.from : undefined,
    typeof req.query.to === 'string' ? req.query.to : undefined,
  );

  const types = new Set<ReviewTimelineType>(
    String(req.query.types ?? 'plans,products,certificates')
      .split(',')
      .map((type) => type.trim())
      .filter((type): type is ReviewTimelineType =>
        type === 'plans' || type === 'products' || type === 'certificates',
      ),
  );

  const nowIso = new Date().toISOString();
  const items: Array<{
    id: string;
    entityType: 'plan' | 'product' | 'certificate';
    title: string;
    ownerName: string;
    status: string;
    submittedAt: string;
    reviewedAt: string | null;
    startAt: string;
    endAt: string;
    isPending: boolean;
  }> = [];

  if (types.has('plans')) {
    const plans = await prisma.therapyPlan.findMany({
      where: {
        status: { in: ['PENDING_REVIEW', 'PUBLISHED', 'REJECTED'] },
        submittedAt: { not: null, gte: from, lte: to },
      },
      select: {
        id: true,
        title: true,
        status: true,
        submittedAt: true,
        reviewedAt: true,
        userProfile: {
          select: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { submittedAt: 'asc' },
    });

    plans.forEach((plan) => {
      const submittedAt = (plan.submittedAt ?? new Date()).toISOString();
      const reviewedAt = plan.reviewedAt ? plan.reviewedAt.toISOString() : null;
      items.push({
        id: plan.id,
        entityType: 'plan',
        title: plan.title,
        ownerName: `${plan.userProfile.user.firstName} ${plan.userProfile.user.lastName}`.trim(),
        status: plan.status,
        submittedAt,
        reviewedAt,
        startAt: submittedAt,
        endAt: reviewedAt ?? nowIso,
        isPending: plan.status === 'PENDING_REVIEW' || !reviewedAt,
      });
    });
  }

  if (types.has('products')) {
    const products = await prisma.product.findMany({
      where: {
        status: { in: ['PENDING_REVIEW', 'PUBLISHED', 'REJECTED'] },
        submittedAt: { not: null, gte: from, lte: to },
      },
      select: {
        id: true,
        title: true,
        status: true,
        submittedAt: true,
        reviewedAt: true,
        userProfile: {
          select: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { submittedAt: 'asc' },
    });

    products.forEach((product) => {
      const submittedAt = (product.submittedAt ?? new Date()).toISOString();
      const reviewedAt = product.reviewedAt ? product.reviewedAt.toISOString() : null;
      items.push({
        id: product.id,
        entityType: 'product',
        title: product.title,
        ownerName: `${product.userProfile.user.firstName} ${product.userProfile.user.lastName}`.trim(),
        status: product.status,
        submittedAt,
        reviewedAt,
        startAt: submittedAt,
        endAt: reviewedAt ?? nowIso,
        isPending: product.status === 'PENDING_REVIEW' || !reviewedAt,
      });
    });
  }

  if (types.has('certificates')) {
    const certificates = await prisma.userCertificate.findMany({
      where: {
        appliedAt: { gte: from, lte: to },
      },
      select: {
        id: true,
        type: true,
        status: true,
        appliedAt: true,
        reviewedAt: true,
        profile: {
          select: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { appliedAt: 'asc' },
    });

    certificates.forEach((cert) => {
      const submittedAt = cert.appliedAt.toISOString();
      const reviewedAt = cert.reviewedAt ? cert.reviewedAt.toISOString() : null;
      items.push({
        id: cert.id,
        entityType: 'certificate',
        title: cert.type,
        ownerName: `${cert.profile.user.firstName} ${cert.profile.user.lastName}`.trim(),
        status: cert.status,
        submittedAt,
        reviewedAt,
        startAt: submittedAt,
        endAt: reviewedAt ?? nowIso,
        isPending: cert.status === 'PENDING' || !reviewedAt,
      });
    });
  }

  items.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  res.json(items);
};

export const getScheduleTimeline = async (req: Request, res: Response) => {
  const { from, to } = parseRange(
    typeof req.query.from === 'string' ? req.query.from : undefined,
    typeof req.query.to === 'string' ? req.query.to : undefined,
  );

  const [appointments, plans] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        startTime: { lt: to },
        endTime: { gte: from },
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        status: true,
        client: { select: { firstName: true, lastName: true } },
        userProfile: { select: { user: { select: { firstName: true, lastName: true } } } },
      },
      orderBy: { startTime: 'asc' },
    }),
    prisma.therapyPlan.findMany({
      where: {
        status: { in: ['PUBLISHED', 'SIGN_UP_CLOSED', 'IN_PROGRESS', 'FINISHED'] },
        startTime: { lt: to },
        OR: [{ endTime: { gte: from } }, { endTime: null }],
      },
      select: {
        id: true,
        title: true,
        startTime: true,
        endTime: true,
        status: true,
        userProfile: { select: { user: { select: { firstName: true, lastName: true } } } },
      },
      orderBy: { startTime: 'asc' },
    }),
  ]);

  const appointmentItems = appointments.map((appointment) => ({
    id: appointment.id,
    entityType: 'appointment' as const,
    title: `Appointment: ${appointment.client.firstName} ${appointment.client.lastName}`.trim(),
    ownerName: `${appointment.userProfile.user.firstName} ${appointment.userProfile.user.lastName}`.trim(),
    status: appointment.status,
    startTime: appointment.startTime.toISOString(),
    endTime: appointment.endTime.toISOString(),
  }));

  const planItems = plans.map((plan) => ({
    id: plan.id,
    entityType: 'plan' as const,
    title: plan.title,
    ownerName: `${plan.userProfile.user.firstName} ${plan.userProfile.user.lastName}`.trim(),
    status: plan.status,
    startTime: plan.startTime.toISOString(),
    endTime: (plan.endTime ?? plan.startTime).toISOString(),
  }));

  res.json(
    [...appointmentItems, ...planItems].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    ),
  );
};

