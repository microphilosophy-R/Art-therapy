import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma';
import { uploadAsset, deleteAsset } from '../../services/upload.service';
import type {
  UpdateProfileInput,
  UpdatePasswordInput,
  CreateMemberAddressInput,
  UpdateMemberAddressInput,
} from '../../schemas/user.schemas';

const MAX_MEMBER_ADDRESSES = 6;
const prismaAny = prisma as any;

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
      userProfile: {
        include: {
          galleryImages: { orderBy: { order: 'asc' } },
          certificates: true,
        },
      },
    },
  });
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
};

export const updateProfile = async (req: Request, res: Response) => {
  const body = req.body as UpdateProfileInput;

  // Update User fields
  const userData: any = {};
  if (body.firstName !== undefined) userData.firstName = body.firstName;
  if (body.lastName !== undefined) userData.lastName = body.lastName;
  if (body.nickname !== undefined) userData.nickname = body.nickname;
  if (body.birthday !== undefined) userData.birthday = body.birthday ? new Date(body.birthday) : null;
  if (body.age !== undefined) userData.age = body.age;
  if (body.gender !== undefined) userData.gender = body.gender;
  if (body.country !== undefined) userData.country = body.country;
  if (body.religion !== undefined) userData.religion = body.religion;
  if (body.phone !== undefined) userData.phone = body.phone;

  // Update UserProfile fields
  const profileData: any = {};
  if (body.bio !== undefined) profileData.bio = body.bio;
  if (body.specialties !== undefined) profileData.specialties = body.specialties;
  if (body.sessionPrice !== undefined) profileData.sessionPrice = body.sessionPrice;
  if (body.sessionLength !== undefined) profileData.sessionLength = body.sessionLength;
  if (body.locationCity !== undefined) profileData.locationCity = body.locationCity;
  if (body.isAccepting !== undefined) profileData.isAccepting = body.isAccepting;
  if (body.consultEnabled !== undefined) profileData.consultEnabled = body.consultEnabled;
  if (body.hourlyConsultFee !== undefined) profileData.hourlyConsultFee = body.hourlyConsultFee;
  if (body.featuredImageUrl !== undefined) profileData.featuredImageUrl = body.featuredImageUrl;
  if (body.socialLinks !== undefined) profileData.socialLinks = body.socialLinks;
  if (body.qrCodeUrl !== undefined) profileData.qrCodeUrl = body.qrCodeUrl;
  if (body.showcaseConfig !== undefined) profileData.showcaseConfig = body.showcaseConfig;

  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: {
      ...userData,
      ...(Object.keys(profileData).length > 0 && {
        userProfile: {
          upsert: {
            create: profileData,
            update: profileData,
          },
        },
      }),
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
      userProfile: true,
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

export const uploadAvatar = async (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

  const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { avatarUrl: true } });
  const oldUrl = user?.avatarUrl;

  const avatarUrl = await uploadAsset(req.file.buffer, 'avatar', req.user!.id);
  await prisma.user.update({ where: { id: req.user!.id }, data: { avatarUrl } });

  if (oldUrl && oldUrl !== avatarUrl) {
    await deleteAsset(oldUrl);
  }

  res.json({ avatarUrl });
};

export const submitProfileForReview = async (req: Request, res: Response) => {
  const userProfile = await prisma.userProfile.findUnique({
    where: { userId: req.user!.id },
  });

  if (!userProfile) {
    return res.status(404).json({ message: 'User profile not found' });
  }

  await prisma.userProfile.update({
    where: { id: userProfile.id },
    data: {
      profileStatus: 'PENDING_REVIEW',
      submittedAt: new Date(),
    },
  });

  res.json({ message: 'Profile submitted for review' });
};

export const uploadPortrait = async (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

  const userProfile = await prisma.userProfile.findUnique({
    where: { userId: req.user!.id },
    select: { id: true, featuredImageUrl: true },
  });

  if (!userProfile) {
    return res.status(404).json({ message: 'User profile not found' });
  }

  const oldUrl = userProfile.featuredImageUrl;
  const featuredImageUrl = await uploadAsset(req.file.buffer, 'user-portrait', req.user!.id);

  await prisma.userProfile.update({
    where: { id: userProfile.id },
    data: { featuredImageUrl },
  });

  if (oldUrl && oldUrl !== featuredImageUrl) {
    await deleteAsset(oldUrl);
  }

  res.json({ featuredImageUrl });
};

export const addGalleryImage = async (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

  const userProfile = await prisma.userProfile.findUnique({
    where: { userId: req.user!.id },
    select: { id: true },
  });

  if (!userProfile) {
    return res.status(404).json({ message: 'User profile not found' });
  }

  const count = await prisma.galleryImage.count({
    where: { userProfileId: userProfile.id },
  });

  if (count >= 9) {
    return res.status(400).json({ message: 'Maximum 9 gallery images allowed' });
  }

  const url = await uploadAsset(req.file.buffer, 'user-gallery', req.user!.id);

  const image = await prisma.galleryImage.create({
    data: {
      userProfileId: userProfile.id,
      url,
      order: count,
    },
  });

  res.json(image);
};

export const deleteGalleryImage = async (req: Request, res: Response) => {
  const { imageId } = req.params;

  const image = await prisma.galleryImage.findUnique({
    where: { id: imageId },
    include: { userProfile: true },
  });

  if (!image) {
    return res.status(404).json({ message: 'Image not found' });
  }

  if (image.userProfile.userId !== req.user!.id) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  await deleteAsset(image.url);
  await prisma.galleryImage.delete({ where: { id: imageId } });

  res.json({ message: 'Image deleted' });
};

export const reorderGalleryImages = async (req: Request, res: Response) => {
  const { order } = req.body as { order: string[] };

  const userProfile = await prisma.userProfile.findUnique({
    where: { userId: req.user!.id },
    select: { id: true },
  });

  if (!userProfile) {
    return res.status(404).json({ message: 'User profile not found' });
  }

  await prisma.$transaction(
    order.map((id, index) =>
      prisma.galleryImage.update({
        where: { id },
        data: { order: index },
      })
    )
  );

  res.json({ message: 'Order updated' });
};

export const updateShowcaseOrder = async (req: Request, res: Response) => {
  const { items } = req.body;

  const userProfile = await prisma.userProfile.findUnique({
    where: { userId: req.user!.id },
  });

  if (!userProfile) {
    return res.status(404).json({ message: 'User profile not found' });
  }

  await prisma.userProfile.update({
    where: { id: userProfile.id },
    data: { showcaseOrder: JSON.stringify(items) },
  });

  res.json({ message: 'Showcase updated' });
};

export const listMemberAddresses = async (req: Request, res: Response) => {
  const addresses = await prismaAny.memberAddress.findMany({
    where: { userId: req.user!.id },
    orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
  });
  res.json(addresses);
};

export const createMemberAddress = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const body = req.body as CreateMemberAddressInput;
  const existingCount = await prismaAny.memberAddress.count({ where: { userId } });

  if (existingCount >= MAX_MEMBER_ADDRESSES) {
    return res.status(400).json({ message: `Maximum ${MAX_MEMBER_ADDRESSES} addresses allowed` });
  }

  const makeDefault = body.isDefault === true || existingCount === 0;

  const created = await prisma.$transaction(async (tx) => {
    const txAny = tx as any;
    if (makeDefault) {
      await txAny.memberAddress.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return txAny.memberAddress.create({
      data: {
        userId,
        recipientName: body.recipientName.trim(),
        mobile: body.mobile.trim(),
        province: body.province.trim(),
        city: body.city.trim(),
        district: body.district.trim(),
        addressDetail: body.addressDetail.trim(),
        postalCode: body.postalCode?.trim() || null,
        tag: body.tag,
        isDefault: makeDefault,
      },
    });
  });

  res.status(201).json(created);
};

export const updateMemberAddress = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;
  const body = req.body as UpdateMemberAddressInput;

  const existing = await prismaAny.memberAddress.findFirst({ where: { id, userId } });
  if (!existing) return res.status(404).json({ message: 'Address not found' });

  const shouldMakeDefault = body.isDefault === true;

  const updated = await prisma.$transaction(async (tx) => {
    const txAny = tx as any;
    if (shouldMakeDefault) {
      await txAny.memberAddress.updateMany({
        where: { userId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const next = await txAny.memberAddress.update({
      where: { id },
      data: {
        recipientName: body.recipientName?.trim(),
        mobile: body.mobile?.trim(),
        province: body.province?.trim(),
        city: body.city?.trim(),
        district: body.district?.trim(),
        addressDetail: body.addressDetail?.trim(),
        postalCode: body.postalCode !== undefined ? body.postalCode?.trim() || null : undefined,
        tag: body.tag,
        isDefault: body.isDefault,
      },
    });

    // Keep at least one default if user explicitly unsets default.
    if (body.isDefault === false && next.isDefault === false) {
      const hasDefault = await txAny.memberAddress.count({
        where: { userId, isDefault: true, id: { not: id } },
      });
      if (hasDefault === 0) {
        return txAny.memberAddress.update({
          where: { id },
          data: { isDefault: true },
        });
      }
    }

    return next;
  });

  res.json(updated);
};

export const deleteMemberAddress = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;

  const existing = await prismaAny.memberAddress.findFirst({ where: { id, userId } });
  if (!existing) return res.status(404).json({ message: 'Address not found' });

  await prisma.$transaction(async (tx) => {
    const txAny = tx as any;
    await txAny.memberAddress.delete({ where: { id } });

    if (existing.isDefault) {
      const replacement = await txAny.memberAddress.findFirst({
        where: { userId },
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      });
      if (replacement) {
        await txAny.memberAddress.update({
          where: { id: replacement.id },
          data: { isDefault: true },
        });
      }
    }
  });

  res.status(204).send();
};

export const setDefaultMemberAddress = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;

  const existing = await prismaAny.memberAddress.findFirst({ where: { id, userId } });
  if (!existing) return res.status(404).json({ message: 'Address not found' });

  const updated = await prisma.$transaction(async (tx) => {
    const txAny = tx as any;
    await txAny.memberAddress.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });

    return txAny.memberAddress.update({
      where: { id },
      data: { isDefault: true },
    });
  });

  res.json(updated);
};

export const getPendingProfiles = async (req: Request, res: Response) => {
  const profiles = await prisma.userProfile.findMany({
    where: { profileStatus: 'PENDING_REVIEW' },
    include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
    orderBy: { submittedAt: 'asc' },
  });
  res.json({ data: profiles });
};

export const reviewProfile = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { action, rejectionReason } = req.body;

  const profile = await prisma.userProfile.findUnique({ where: { id } });
  if (!profile) return res.status(404).json({ message: 'Profile not found' });
  if (profile.profileStatus !== 'PENDING_REVIEW') {
    return res.status(400).json({ message: 'Only pending profiles can be reviewed' });
  }

  await prisma.userProfile.update({
    where: { id },
    data: {
      profileStatus: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
      rejectionReason: action === 'REJECT' ? rejectionReason : null,
      reviewedAt: new Date(),
    },
  });

  res.json({ message: 'Profile reviewed' });
};

