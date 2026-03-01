import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';

const updateProfileSchema = z.object({
    bio: z.string().min(10, 'Bio must be at least 10 characters').optional(),
    portfolioUrl: z.string().url().optional().or(z.literal('')),
    socialMediaLink: z.string().url().optional().or(z.literal('')),
});

export const getMyProfile = async (req: Request, res: Response) => {
    const profile = await prisma.artistProfile.findUnique({
        where: { userId: req.user!.id },
        include: {
            user: {
                select: {
                    firstName: true,
                    lastName: true,
                    email: true,
                    avatarUrl: true,
                },
            },
        },
    });

    if (!profile) {
        return res.status(404).json({ message: 'Profile not found' });
    }

    res.json(profile);
};

export const updateProfile = async (req: Request, res: Response) => {
    const data = req.body as z.infer<typeof updateProfileSchema>;

    const profile = await prisma.artistProfile.upsert({
        where: { userId: req.user!.id },
        create: {
            userId: req.user!.id,
            bio: data.bio ?? '',
            portfolioUrl: data.portfolioUrl,
            socialMediaLink: data.socialMediaLink,
            profileStatus: 'PENDING_REVIEW', // Require review initially
        },
        update: {
            bio: data.bio,
            portfolioUrl: data.portfolioUrl,
            socialMediaLink: data.socialMediaLink,
        },
    });

    res.json(profile);
};

export const submitForReview = async (req: Request, res: Response) => {
    const profile = await prisma.artistProfile.findUnique({
        where: { userId: req.user!.id },
    });

    if (!profile) {
        return res.status(404).json({ message: 'Profile not found. Please create one first.' });
    }

    if (profile.bio.length < 10) {
        return res.status(400).json({ message: 'Bio is too short to be submitted.' });
    }

    const updated = await prisma.artistProfile.update({
        where: { id: profile.id },
        data: {
            profileStatus: 'PENDING_REVIEW',
            submittedAt: new Date(),
        },
    });

    res.json(updated);
};

export const getPublicProfile = async (req: Request, res: Response) => {
    const { id } = req.params;

    const profile = await prisma.artistProfile.findUnique({
        where: { id },
        include: {
            user: {
                select: {
                    firstName: true,
                    lastName: true,
                    avatarUrl: true,
                },
            },
        },
    });

    if (!profile || profile.profileStatus !== 'APPROVED') {
        return res.status(404).json({ message: 'Artist not found' });
    }

    res.json(profile);
};

export const ArtistController = {
    getMyProfile,
    updateProfile,
    submitForReview,
    getPublicProfile,
    updateProfileSchema,
};
