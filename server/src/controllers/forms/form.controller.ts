import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import type { CreateFormInput, SubmitFormInput } from '../../schemas/form.schemas';

// ── Therapist / Admin: create a form ─────────────────────────────────────────

export const createForm = async (req: Request, res: Response) => {
  const body = req.body as CreateFormInput;
  const senderId = req.user!.id;

  // Verify recipient exists and is a MEMBER
  const recipient = await prisma.user.findUnique({ where: { id: body.recipientId } });
  if (!recipient) return res.status(404).json({ message: 'Recipient not found' });
  if (recipient.role !== 'MEMBER') return res.status(400).json({ message: 'Recipient must be a member' });

  const form = await prisma.clientForm.create({
    data: {
      title: body.title,
      description: body.description,
      senderId,
      recipientId: body.recipientId,
      status: 'DRAFT',
      questions: {
        create: body.questions.map((q) => ({
          order: q.order,
          type: q.type as any,
          label: q.label,
          required: q.required,
          options: q.options,
          scaleMin: q.scaleMin,
          scaleMax: q.scaleMax,
        })),
      },
    },
    include: { questions: { orderBy: { order: 'asc' } }, recipient: { select: { id: true, firstName: true, lastName: true, email: true } } },
  });

  res.status(201).json(form);
};

// ── Therapist / Admin: send a draft form to the client ───────────────────────

export const sendForm = async (req: Request, res: Response) => {
  const { id } = req.params;
  const senderId = req.user!.id;

  const form = await prisma.clientForm.findUnique({ where: { id } });
  if (!form) return res.status(404).json({ message: 'Form not found' });
  if (form.senderId !== senderId && req.user!.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Forbidden' });
  }
  if (form.status !== 'DRAFT') return res.status(400).json({ message: 'Only draft forms can be sent' });

  const updated = await prisma.clientForm.update({
    where: { id },
    data: { status: 'SENT', sentAt: new Date() },
    include: { questions: { orderBy: { order: 'asc' } } },
  });

  res.json(updated);
};

// ── Therapist / Admin: list forms they sent ───────────────────────────────────

export const listSentForms = async (req: Request, res: Response) => {
  const { page = 1, limit = 20, status } = req.query as any;
  const skip = (Number(page) - 1) * Number(limit);
  const senderId = req.user!.role === 'ADMIN' ? undefined : req.user!.id;

  const where = {
    ...(senderId && { senderId }),
    ...(status && { status }),
  };

  const [data, total] = await Promise.all([
    prisma.clientForm.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { updatedAt: 'desc' },
      include: {
        recipient: { select: { id: true, firstName: true, lastName: true, email: true } },
        sender: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { responses: true } },
      },
    }),
    prisma.clientForm.count({ where }),
  ]);

  res.json({ data, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) });
};

// ── Therapist / Admin: view a form and its responses ─────────────────────────

export const getFormWithResponses = async (req: Request, res: Response) => {
  const { id } = req.params;
  const form = await prisma.clientForm.findUnique({
    where: { id },
    include: {
      questions: { orderBy: { order: 'asc' } },
      responses: {
        include: { answers: { include: { question: true } } },
        orderBy: { submittedAt: 'desc' },
      },
      recipient: { select: { id: true, firstName: true, lastName: true, email: true } },
      sender: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  if (!form) return res.status(404).json({ message: 'Form not found' });

  const userId = req.user!.id;
  const role = req.user!.role;
  if (role !== 'ADMIN' && form.senderId !== userId && form.recipientId !== userId) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  res.json(form);
};

// ── Therapist / Admin: archive a form ────────────────────────────────────────

export const archiveForm = async (req: Request, res: Response) => {
  const { id } = req.params;
  const form = await prisma.clientForm.findUnique({ where: { id } });
  if (!form) return res.status(404).json({ message: 'Form not found' });
  if (form.senderId !== req.user!.id && req.user!.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const updated = await prisma.clientForm.update({ where: { id }, data: { status: 'ARCHIVED' } });
  res.json(updated);
};

// ── Client: list forms received ───────────────────────────────────────────────

export const listReceivedForms = async (req: Request, res: Response) => {
  const recipientId = req.user!.id;
  const { page = 1, limit = 20 } = req.query as any;
  const skip = (Number(page) - 1) * Number(limit);

  const [data, total] = await Promise.all([
    prisma.clientForm.findMany({
      where: { recipientId, status: { in: ['SENT', 'SUBMITTED'] } },
      skip,
      take: Number(limit),
      orderBy: { sentAt: 'desc' },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { questions: true, responses: true } },
      },
    }),
    prisma.clientForm.count({ where: { recipientId, status: { in: ['SENT', 'SUBMITTED'] } } }),
  ]);

  res.json({ data, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) });
};

// ── Client: get a single form to fill ────────────────────────────────────────

export const getFormForClient = async (req: Request, res: Response) => {
  const { id } = req.params;
  const recipientId = req.user!.id;

  const form = await prisma.clientForm.findUnique({
    where: { id },
    include: { questions: { orderBy: { order: 'asc' } }, sender: { select: { id: true, firstName: true, lastName: true } } },
  });

  if (!form) return res.status(404).json({ message: 'Form not found' });
  if (form.recipientId !== recipientId) return res.status(403).json({ message: 'Forbidden' });
  if (!['SENT', 'SUBMITTED'].includes(form.status)) return res.status(400).json({ message: 'Form is not available' });

  res.json(form);
};

// ── Client: submit a form ─────────────────────────────────────────────────────

export const submitForm = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { answers } = req.body as SubmitFormInput;
  const recipientId = req.user!.id;

  const form = await prisma.clientForm.findUnique({
    where: { id },
    include: { questions: true },
  });

  if (!form) return res.status(404).json({ message: 'Form not found' });
  if (form.recipientId !== recipientId) return res.status(403).json({ message: 'Forbidden' });
  if (form.status === 'SUBMITTED') return res.status(400).json({ message: 'Form already submitted' });
  if (!['SENT', 'DRAFT'].includes(form.status)) return res.status(400).json({ message: 'Form cannot be submitted' });

  // Validate required questions are answered
  const requiredQIds = form.questions.filter((q) => q.required).map((q) => q.id);
  const answeredQIds = answers.map((a) => a.questionId);
  const missing = requiredQIds.filter((id) => !answeredQIds.includes(id));
  if (missing.length > 0) {
    return res.status(400).json({ message: 'Please answer all required questions', missing });
  }

  const [response] = await prisma.$transaction([
    prisma.formResponse.create({
      data: {
        formId: id,
        answers: {
          create: answers.map((a) => ({
            questionId: a.questionId,
            value: a.value,
          })),
        },
      },
      include: { answers: true },
    }),
    prisma.clientForm.update({
      where: { id },
      data: { status: 'SUBMITTED', submittedAt: new Date() },
    }),
  ]);

  res.status(201).json(response);
};

