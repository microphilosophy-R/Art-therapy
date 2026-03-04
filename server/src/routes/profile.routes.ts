import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { getProfile, updateProfile, updatePassword, acceptPrivacy, uploadAvatar, submitProfileForReview, uploadPortrait, addGalleryImage, deleteGalleryImage, reorderGalleryImages, updateShowcaseOrder } from '../controllers/profile.controller';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { updateProfileSchema, updatePasswordSchema, acceptPrivacySchema } from '../schemas/user.schemas';

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

function multerErrorHandler(err: unknown, _req: Request, res: Response, next: NextFunction) {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ message: 'Avatar too large. Maximum size is 5 MB.' });
  }
  if (err instanceof Error && err.message.includes('Only image')) {
    return res.status(415).json({ message: err.message });
  }
  next(err);
}

export const profileRouter = Router();

profileRouter.use(authenticate);

profileRouter.get('/', getProfile);
profileRouter.get('/me', getProfile);
profileRouter.patch('/', validate(updateProfileSchema), updateProfile);
profileRouter.patch('/password', validate(updatePasswordSchema), updatePassword);
profileRouter.post('/privacy-consent', validate(acceptPrivacySchema), acceptPrivacy);
profileRouter.post('/avatar', avatarUpload.single('avatar'), multerErrorHandler, uploadAvatar);
profileRouter.post('/portrait', avatarUpload.single('portrait'), multerErrorHandler, uploadPortrait);
profileRouter.post('/gallery', avatarUpload.single('image'), multerErrorHandler, addGalleryImage);
profileRouter.delete('/gallery/:imageId', deleteGalleryImage);
profileRouter.patch('/gallery/reorder', reorderGalleryImages);
profileRouter.post('/submit-for-review', submitProfileForReview);
profileRouter.patch('/showcase', updateShowcaseOrder);
