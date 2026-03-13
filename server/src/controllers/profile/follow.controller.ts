import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import type { ListMyFollowsQuery } from '../../schemas/follow.schemas';

const assertMemberToMemberFollowAllowed = async (followerId: string, followingId: string) => {
  if (followerId === followingId) {
    return { ok: false as const, status: 400, message: 'You cannot follow yourself.' };
  }

  const [follower, following] = await Promise.all([
    prisma.user.findUnique({ where: { id: followerId }, select: { id: true, role: true } }),
    prisma.user.findUnique({ where: { id: followingId }, select: { id: true, role: true } }),
  ]);

  if (!following) {
    return { ok: false as const, status: 404, message: 'Target user not found.' };
  }
  if (!follower || follower.role !== 'MEMBER' || following.role !== 'MEMBER') {
    return {
      ok: false as const,
      status: 403,
      message: 'Follow is only allowed between MEMBER users.',
    };
  }

  return { ok: true as const };
};

export const followUser = async (req: Request, res: Response) => {
  const followerId = req.user!.id;
  const { userId: followingId } = req.params;
  const check = await assertMemberToMemberFollowAllowed(followerId, followingId);
  if (!check.ok) return res.status(check.status).json({ message: check.message });

  const existing = await prisma.userFollow.findUnique({
    where: { followerId_followingId: { followerId, followingId } },
  });
  if (existing) {
    return res.status(409).json({ message: 'You are already following this user.' });
  }

  await prisma.userFollow.create({
    data: { followerId, followingId },
  });

  res.status(201).json({ success: true });
};

export const unfollowUser = async (req: Request, res: Response) => {
  const followerId = req.user!.id;
  const { userId: followingId } = req.params;

  await prisma.userFollow.deleteMany({
    where: { followerId, followingId },
  });

  res.status(204).send();
};

export const getFollowStatus = async (req: Request, res: Response) => {
  const followerId = req.user!.id;
  const { userId: followingId } = req.params;

  const follow = await prisma.userFollow.findUnique({
    where: { followerId_followingId: { followerId, followingId } },
    select: { id: true },
  });

  res.json({ isFollowing: !!follow });
};

export const listMyFollows = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { tab, page, limit } = req.query as unknown as ListMyFollowsQuery;
  const skip = (page - 1) * limit;

  if (tab === 'followers') {
    const [rows, total] = await Promise.all([
      prisma.userFollow.findMany({
        where: { followingId: userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          follower: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
        },
      }),
      prisma.userFollow.count({ where: { followingId: userId } }),
    ]);

    return res.json({
      data: rows.map((row) => ({ ...row.follower, followedAt: row.createdAt })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  }

  const [rows, total] = await Promise.all([
    prisma.userFollow.findMany({
      where: { followerId: userId },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        following: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    }),
    prisma.userFollow.count({ where: { followerId: userId } }),
  ]);

  return res.json({
    data: rows.map((row) => ({ ...row.following, followedAt: row.createdAt })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
};

