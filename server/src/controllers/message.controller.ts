import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import type { SendManualMessageInput } from '../schemas/message.schemas';

const MESSAGE_PLAN_INCLUDE = {
  plan: {
    select: { id: true, title: true, type: true, status: true },
  },
  sender: {
    select: { id: true, firstName: true, lastName: true },
  },
} as const;

// ─── Get inbox ────────────────────────────────────────────────────────────────

export const getMyMessages = async (req: Request, res: Response) => {
  const page  = Number(req.query.page)  || 1;
  const limit = Number(req.query.limit) || 20;
  const skip  = (page - 1) * limit;

  const where = { recipientId: req.user!.id };

  const [messages, total] = await Promise.all([
    prisma.message.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: MESSAGE_PLAN_INCLUDE,
    }),
    prisma.message.count({ where }),
  ]);

  res.json({
    data: messages,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
};

// ─── Unread count ─────────────────────────────────────────────────────────────

export const getUnreadCount = async (req: Request, res: Response) => {
  const count = await prisma.message.count({
    where: { recipientId: req.user!.id, isRead: false },
  });
  res.json({ count });
};

// ─── Mark single message as read ─────────────────────────────────────────────

export const markAsRead = async (req: Request, res: Response) => {
  const { id } = req.params;

  const message = await prisma.message.findUnique({ where: { id } });
  if (!message) return res.status(404).json({ message: 'Message not found' });
  if (message.recipientId !== req.user!.id) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const updated = await prisma.message.update({
    where: { id },
    data: { isRead: true, readAt: new Date() },
    include: MESSAGE_PLAN_INCLUDE,
  });

  res.json(updated);
};

// ─── Mark all messages as read ────────────────────────────────────────────────

export const markAllAsRead = async (req: Request, res: Response) => {
  const result = await prisma.message.updateMany({
    where: { recipientId: req.user!.id, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
  res.json({ updated: result.count });
};

// ─── Send manual message (Admin only) ────────────────────────────────────────

export const sendManualMessage = async (req: Request, res: Response) => {
  const body = req.body as SendManualMessageInput;

  const recipient = await prisma.user.findUnique({ where: { id: body.recipientId } });
  if (!recipient) return res.status(404).json({ message: 'Recipient not found' });

  const message = await prisma.message.create({
    data: {
      senderId:    req.user!.id,
      recipientId: body.recipientId,
      body:        body.body,
      trigger:     'MANUAL',
    },
    include: MESSAGE_PLAN_INCLUDE,
  });

  res.status(201).json(message);
};
