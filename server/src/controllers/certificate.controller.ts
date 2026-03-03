import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const applyCertificate = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { type } = req.body;

  let profile = await prisma.userProfile.findUnique({ where: { userId } });
  if (!profile) {
    profile = await prisma.userProfile.create({ data: { userId } });
  }

  const certificate = await prisma.userCertificate.create({
    data: {
      profileId: profile.id,
      type,
      tosAcceptedAt: new Date(),
    },
  });

  res.json(certificate);
};

export const uploadCertificateFiles = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { certificateUrls } = req.body;

  const certificate = await prisma.userCertificate.update({
    where: { id },
    data: { certificateUrls },
  });

  res.json(certificate);
};

export const getMyCertificates = async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const profile = await prisma.userProfile.findUnique({ where: { userId } });
  if (!profile) return res.json([]);

  const certificates = await prisma.userCertificate.findMany({
    where: { profileId: profile.id },
  });

  res.json(certificates);
};
