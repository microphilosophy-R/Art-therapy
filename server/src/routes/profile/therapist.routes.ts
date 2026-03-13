import { Router } from 'express';
import multer from 'multer';
import { prisma } from '../../lib/prisma';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import type { CertificateType } from '@prisma/client';
import { therapistController } from '../../controllers';

const providerCertificateTypes: CertificateType[] = ['THERAPIST', 'COUNSELOR'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

const requireProviderCertificate = async (req: any, res: any, next: any) => {
  try {
    if (req.user?.role === 'ADMIN') return next();
    if (req.user?.role !== 'MEMBER') return res.status(403).json({ message: 'Forbidden' });

    const cached = req.user.approvedCertificates ?? [];
    if (cached.some((c: string) => providerCertificateTypes.includes(c as CertificateType))) {
      return next();
    }

    const profile = await prisma.userProfile.findUnique({
      where: { userId: req.user.id },
      select: {
        certificates: {
          where: {
            status: 'APPROVED',
            type: { in: providerCertificateTypes },
          },
          select: { type: true },
        },
      },
    });

    if (!profile?.certificates?.length) {
      return res.status(403).json({ message: 'Requires approved THERAPIST or COUNSELOR certificate' });
    }

    req.user.approvedCertificates = Array.from(
      new Set([...(req.user.approvedCertificates ?? []), ...profile.certificates.map((c) => c.type)]),
    );
    return next();
  } catch (error) {
    console.error('Provider certificate check failed:', error);
    return res.status(500).json({ message: 'Failed to verify certificate access' });
  }
};

export const therapistRouter = Router();

// Public endpoints
therapistRouter.get('/', therapistController.listTherapists);
therapistRouter.get(
  '/pending-profiles',
  authenticate,
  authorize('ADMIN'),
  therapistController.getPendingTherapistProfiles,
);
therapistRouter.get('/:therapistId/slots', therapistController.getTherapistSlots);
therapistRouter.get('/:id', therapistController.getTherapistById);

// Admin review endpoints kept for legacy client compatibility
therapistRouter.post(
  '/:id/review-profile',
  authenticate,
  authorize('ADMIN'),
  therapistController.reviewTherapistProfile,
);

// Provider profile management endpoints
therapistRouter.put(
  '/:id',
  authenticate,
  authorize('MEMBER', 'ADMIN'),
  requireProviderCertificate,
  therapistController.updateTherapistProfileById,
);
therapistRouter.post(
  '/:id/submit-profile',
  authenticate,
  authorize('MEMBER', 'ADMIN'),
  requireProviderCertificate,
  therapistController.submitTherapistProfile,
);
therapistRouter.post(
  '/:therapistId/gallery',
  authenticate,
  authorize('MEMBER', 'ADMIN'),
  requireProviderCertificate,
  upload.single('file'),
  therapistController.addTherapistGalleryImage,
);
therapistRouter.delete(
  '/:therapistId/gallery/:imageId',
  authenticate,
  authorize('MEMBER', 'ADMIN'),
  requireProviderCertificate,
  therapistController.deleteTherapistGalleryImage,
);
therapistRouter.patch(
  '/:therapistId/gallery/reorder',
  authenticate,
  authorize('MEMBER', 'ADMIN'),
  requireProviderCertificate,
  therapistController.reorderTherapistGalleryImages,
);

