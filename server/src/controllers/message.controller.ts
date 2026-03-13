import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import type { SendManualMessageInput, SendChatMessageInput } from '../schemas/message.schemas';
import { getConversationByUsers, getOrCreateConversationByUsers } from '../services/chat.service';
import { getSocketServer } from '../lib/socket';

const MESSAGE_PLAN_INCLUDE = {
  plan: {
    select: { id: true, title: true, type: true, status: true },
  },
  sender: {
    select: { id: true, firstName: true, lastName: true },
  },
} as const;

const CHAT_MESSAGE_INCLUDE = {
  sender: {
    select: { id: true, firstName: true, lastName: true, avatarUrl: true },
  },
  recipient: {
    select: { id: true, firstName: true, lastName: true, avatarUrl: true },
  },
} as const;

// Get inbox (system + chat merged by default)
export const getMyMessages = async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const kind = (req.query.kind as 'all' | 'system' | 'chat' | undefined) ?? 'all';
  const skip = (page - 1) * limit;

  const where = {
    recipientId: req.user!.id,
    ...(kind === 'system' ? { conversationId: null } : {}),
    ...(kind === 'chat' ? { conversationId: { not: null as any } } : {}),
  };

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

export const getUnreadCount = async (req: Request, res: Response) => {
  const count = await prisma.message.count({
    where: { recipientId: req.user!.id, isRead: false },
  });
  res.json({ count });
};

export const getConversations = async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  const userId = req.user!.id;

  const where = {
    OR: [{ userAId: userId }, { userBId: userId }],
  };

  const [conversations, total] = await Promise.all([
    prisma.conversation.findMany({
      where,
      skip,
      take: limit,
      orderBy: { lastMessageAt: 'desc' },
      include: {
        userA: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        userB: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    }),
    prisma.conversation.count({ where }),
  ]);

  const data = await Promise.all(
    conversations.map(async (conversation) => {
      const [lastMessage, unreadCount] = await Promise.all([
        prisma.message.findFirst({
          where: { conversationId: conversation.id, trigger: 'CHAT' },
          orderBy: { createdAt: 'desc' },
          include: CHAT_MESSAGE_INCLUDE,
        }),
        prisma.message.count({
          where: {
            conversationId: conversation.id,
            recipientId: userId,
            isRead: false,
            trigger: 'CHAT',
          },
        }),
      ]);

      const peer = conversation.userAId === userId ? conversation.userB : conversation.userA;

      return {
        id: conversation.id,
        peer,
        lastMessage,
        unreadCount,
        lastMessageAt: conversation.lastMessageAt,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      };
    }),
  );

  res.json({
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
};

export const getConversationMessages = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;
  const cursor = req.query.cursor as string | undefined;
  const limit = Number(req.query.limit) || 30;

  const conversation = await prisma.conversation.findUnique({ where: { id } });
  if (!conversation) return res.status(404).json({ message: 'Conversation not found' });

  if (conversation.userAId !== userId && conversation.userBId !== userId) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const messages = await prisma.message.findMany({
    where: { conversationId: id, trigger: 'CHAT' },
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: CHAT_MESSAGE_INCLUDE,
  });

  await prisma.message.updateMany({
    where: {
      conversationId: id,
      recipientId: userId,
      isRead: false,
      trigger: 'CHAT',
    },
    data: { isRead: true, readAt: new Date() },
  });

  res.json({ data: messages.reverse() });
};

export const sendChatMessage = async (req: Request, res: Response) => {
  const senderId = req.user!.id;
  const body = req.body as SendChatMessageInput;

  if (body.recipientId === senderId) {
    return res.status(400).json({ message: 'You cannot message yourself.' });
  }

  const [sender, recipient] = await Promise.all([
    prisma.user.findUnique({ where: { id: senderId }, select: { id: true, role: true } }),
    prisma.user.findUnique({ where: { id: body.recipientId }, select: { id: true, role: true } }),
  ]);

  if (!recipient) return res.status(404).json({ message: 'Recipient not found' });

  const isAdminChat = recipient.role === 'ADMIN';
  const isMemberToMember = sender.role === 'MEMBER' && recipient.role === 'MEMBER';

  if (!isAdminChat && !isMemberToMember) {
    return res.status(403).json({
      message: 'Chat is only available between members or with admins.'
    });
  }

  let conversation = await getConversationByUsers(senderId, body.recipientId);

  if (!conversation) {
    if (recipient.role !== 'ADMIN') {
      const follow = await prisma.userFollow.findUnique({
        where: {
          followerId_followingId: {
            followerId: senderId,
            followingId: body.recipientId,
          },
        },
        select: { id: true },
      });

      if (!follow) {
        return res.status(403).json({ message: 'You must follow this user before starting a chat.' });
      }
    }

    conversation = await getOrCreateConversationByUsers(senderId, body.recipientId);
  }

  const latest = await prisma.message.findFirst({
    where: { conversationId: conversation.id, trigger: 'CHAT' },
    orderBy: { createdAt: 'desc' },
    select: { id: true, senderId: true },
  });

  if (latest && latest.senderId === senderId) {
    return res.status(409).json({
      message: 'Wait for the other user to reply before sending another message.',
    });
  }

  const message = await prisma.$transaction(async (tx) => {
    const created = await tx.message.create({
      data: {
        senderId,
        recipientId: body.recipientId,
        body: body.body,
        trigger: 'CHAT',
        conversationId: conversation!.id,
      },
      include: CHAT_MESSAGE_INCLUDE,
    });

    await tx.conversation.update({
      where: { id: conversation!.id },
      data: { lastMessageAt: created.createdAt },
    });

    return created;
  });

  const io = getSocketServer();
  if (io) {
    io.to(`user:${senderId}`).emit('chat:new_message', message);
    io.to(`user:${body.recipientId}`).emit('chat:new_message', message);
    io.to(`user:${senderId}`).emit('chat:conversation_updated', { conversationId: conversation.id });
    io.to(`user:${body.recipientId}`).emit('chat:conversation_updated', { conversationId: conversation.id });
  }

  res.status(201).json(message);
};

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

export const markAllAsRead = async (req: Request, res: Response) => {
  const result = await prisma.message.updateMany({
    where: { recipientId: req.user!.id, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
  res.json({ updated: result.count });
};

export const sendManualMessage = async (req: Request, res: Response) => {
  const body = req.body as SendManualMessageInput;

  const recipient = await prisma.user.findUnique({ where: { id: body.recipientId } });
  if (!recipient) return res.status(404).json({ message: 'Recipient not found' });

  const message = await prisma.message.create({
    data: {
      senderId: req.user!.id,
      recipientId: body.recipientId,
      body: body.body,
      trigger: 'MANUAL',
      conversationId: null,
    },
    include: MESSAGE_PLAN_INCLUDE,
  });

  res.status(201).json(message);
};
