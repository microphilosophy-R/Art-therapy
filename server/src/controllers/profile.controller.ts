import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import type { UpdateProfileInput, UpdatePasswordInput } from '../schemas/user.schemas';

export const getProfile = async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      nickname: true,
      age: true,
      gender: true,
      phone: true,
      avatarUrl: true,
      role: true,
      privacyConsentAt: true,
      createdAt: true,
    },
  });
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
};

export const updateProfile = async (req: Request, res: Response) => {
  const body = req.body as UpdateProfileInput;
  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: {
      ...(body.firstName !== undefined && { firstName: body.firstName }),
      ...(body.lastName !== undefined && { lastName: body.lastName }),
      ...(body.nickname !== undefined && { nickname: body.nickname }),
      ...(body.age !== undefined && { age: body.age }),
      ...(body.gender !== undefined && { gender: body.gender }),
      ...(body.phone !== undefined && { phone: body.phone }),
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      nickname: true,
      age: true,
      gender: true,
      phone: true,
      avatarUrl: true,
      role: true,
      privacyConsentAt: true,
    },
  });
  res.json(user);
};

export const updatePassword = async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body as UpdatePasswordInput;

  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) return res.status(404).json({ message: 'User not found' });

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) return res.status(400).json({ message: 'Current password is incorrect' });

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: req.user!.id }, data: { passwordHash } });

  res.json({ message: 'Password updated successfully' });
};

export const acceptPrivacy = async (req: Request, res: Response) => {
  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: { privacyConsentAt: new Date() },
    select: { id: true, privacyConsentAt: true },
  });
  res.json(user);
};
