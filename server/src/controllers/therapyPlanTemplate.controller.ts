import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import type {
  CreateTemplateInput,
  ListTemplatesQuery,
  SaveAsTemplateInput,
} from '../schemas/therapyPlanTemplate.schemas';

// ─── List ────────────────────────────────────────────────────────────────────

export const listTemplates = async (req: Request, res: Response) => {
  const query = req.query as ListTemplatesQuery;

  const templates = await prisma.therapyPlanTemplate.findMany({
    where: {
      ...(query.type ? { type: query.type } : {}),
      OR: [{ createdById: req.user!.id }, { isPublic: true }],
    },
    orderBy: [{ isPublic: 'asc' }, { createdAt: 'desc' }],
    include: {
      createdBy: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  return res.json(templates);
};

// ─── Create ──────────────────────────────────────────────────────────────────

export const createTemplate = async (req: Request, res: Response) => {
  const body = req.body as CreateTemplateInput;

  const template = await prisma.therapyPlanTemplate.create({
    data: {
      createdById: req.user!.id,
      type: body.type,
      name: body.name,
      isPublic: body.isPublic ?? false,
      data: body.data as Prisma.InputJsonValue,
    },
  });

  return res.status(201).json(template);
};

// ─── Delete ──────────────────────────────────────────────────────────────────

export const deleteTemplate = async (req: Request, res: Response) => {
  const { id } = req.params;

  const template = await prisma.therapyPlanTemplate.findUnique({ where: { id } });
  if (!template) return res.status(404).json({ message: 'Template not found' });
  if (template.createdById !== req.user!.id) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  await prisma.therapyPlanTemplate.delete({ where: { id } });
  return res.status(204).send();
};

// ─── Save existing plan as template ──────────────────────────────────────────

export const saveAsTemplate = async (req: Request, res: Response) => {
  const { id: planId } = req.params;
  const body = req.body as SaveAsTemplateInput;

  const plan = await prisma.therapyPlan.findUnique({
    where: { id: planId },
    include: {
      therapist: { select: { userId: true } },
    },
  });
  if (!plan) return res.status(404).json({ message: 'Plan not found' });

  const isOwner = plan.therapist.userId === req.user!.id;
  const isAdmin = req.user!.role === 'ADMIN';
  if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Forbidden' });

  // Serialize core plan fields into template data (no poster, no events)
  const data = {
    type: plan.type,
    title: plan.title,
    slogan: plan.slogan ?? '',
    introduction: plan.introduction,
    location: plan.location,
    maxParticipants: plan.maxParticipants != null ? String(plan.maxParticipants) : '',
    contactInfo: plan.contactInfo,
    artSalonSubType: plan.artSalonSubType ?? '',
    sessionMedium: plan.sessionMedium ?? '',
  };

  const template = await prisma.therapyPlanTemplate.create({
    data: {
      createdById: req.user!.id,
      type: plan.type,
      name: body.name,
      isPublic: body.isPublic ?? false,
      data: data as Prisma.InputJsonValue,
    },
  });

  return res.status(201).json(template);
};
