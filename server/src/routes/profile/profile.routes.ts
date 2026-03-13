import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { profileController } from '../../controllers';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import {
  updateProfileSchema,
  updatePasswordSchema,
  acceptPrivacySchema,
  createMemberAddressSchema,
  updateMemberAddressSchema,
  setDefaultMemberAddressSchema,
} from '../../schemas/user.schemas';

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

profileRouter.get('/', profileController.getProfile);
profileRouter.get('/me', profileController.getProfile);
profileRouter.patch('/', validate(updateProfileSchema), profileController.updateProfile);
profileRouter.patch('/password', validate(updatePasswordSchema), profileController.updatePassword);
profileRouter.post('/privacy-consent', validate(acceptPrivacySchema), profileController.acceptPrivacy);
profileRouter.post('/avatar', avatarUpload.single('avatar'), multerErrorHandler, profileController.uploadAvatar);
profileRouter.post('/portrait', avatarUpload.single('portrait'), multerErrorHandler, profileController.uploadPortrait);
profileRouter.post('/gallery', avatarUpload.single('image'), multerErrorHandler, profileController.addGalleryImage);
profileRouter.delete('/gallery/:imageId', profileController.deleteGalleryImage);
profileRouter.patch('/gallery/reorder', profileController.reorderGalleryImages);
profileRouter.post('/submit-for-review', profileController.submitProfileForReview);
profileRouter.patch('/showcase', profileController.updateShowcaseOrder);
profileRouter.get('/addresses', profileController.listMemberAddresses);
profileRouter.post('/addresses', validate(createMemberAddressSchema), profileController.createMemberAddress);
profileRouter.put('/addresses/:id', validate(updateMemberAddressSchema), profileController.updateMemberAddress);
profileRouter.delete('/addresses/:id', profileController.deleteMemberAddress);
profileRouter.post('/addresses/:id/default', validate(setDefaultMemberAddressSchema), profileController.setDefaultMemberAddress);

