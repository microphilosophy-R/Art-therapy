import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { Prisma } from '@prisma/client';

const PROFILE_INCLUDE = {
  user: true,
  certificates: true,
  galleryImages: { orderBy: { order: Prisma.SortOrder.asc } },
  refundPolicy: true,
} satisfies Prisma.UserProfileInclude;

export const getMyProfile = async (req: Request, res: Response) => {
  const userId = req.user!.id;

  let profile = await prisma.userProfile.findUnique({
    where: { userId },
    include: PROFILE_INCLUDE,
  });

  if (!profile) {
    profile = await prisma.userProfile.create({
      data: { userId },
      include: PROFILE_INCLUDE,
    });
  }

  res.json(profile);
};

export const getPublicProfile = async (req: Request, res: Response) => {
  const { id } = req.params;

  const profile = await prisma.userProfile.findFirst({
    where: { OR: [{ id }, { userId: id }] },
    include: PROFILE_INCLUDE,
  });

  if (!profile) return res.status(404).json({ message: 'Profile not found' });

  if (profile.profileStatus !== 'APPROVED') {
    if (!req.user || (req.user.role !== 'ADMIN' && profile.userId !== req.user.id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
  }

  const isOwnProfile = req.user?.id === profile.userId;
  if (!isOwnProfile && profile.privateFields) {
    const privateFields = profile.privateFields as Record<string, boolean>;
    if (privateFields.telephone) delete (profile as any).telephone;
    if (privateFields.birthday) delete (profile as any).birthday;
    if (privateFields.region) delete (profile as any).region;
    if (privateFields.religion) delete (profile as any).religion;
  }

  res.json(profile);
};

export const updateProfileStep = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { stepNumber } = req.params;
  const data = req.body;

  let profile = await prisma.userProfile.findUnique({ where: { userId } });

  if (!profile) {
    profile = await prisma.userProfile.create({ data: { userId } });
  }

  if (profile.profileStatus === 'APPROVED') {
    data.profileStatus = 'DRAFT';
  }

  const updated = await prisma.userProfile.update({
    where: { userId },
    data,
    include: PROFILE_INCLUDE,
  });

  res.json(updated);
};

export const submitProfile = async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const profile = await prisma.userProfile.update({
    where: { userId },
    data: {
      profileStatus: 'PENDING_REVIEW',
      submittedAt: new Date(),
    },
    include: PROFILE_INCLUDE,
  });

  res.json(profile);
};

export const previewPublicProfile = async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    include: PROFILE_INCLUDE,
  });

  if (!profile) return res.status(404).json({ message: 'Profile not found' });

  res.json(profile);
};

