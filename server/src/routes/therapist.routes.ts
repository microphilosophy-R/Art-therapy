import { Router } from 'express';
import multer from 'multer';
import {
  listTherapists, getTherapist, getAvailableSlots, updateProfile, setAvailability,
  submitProfile, reviewProfile, addGalleryImage, deleteGalleryImage, reorderGalleryImages,
  listPendingProfiles,
} from '../controllers/therapist.controller';
import { authenticate } from '../middleware/authenticate';
import { authenticateOptional } from '../middleware/authenticateOptional';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import { updateProfileSchema, availabilitySchema, reviewProfileSchema } from '../schemas/therapist.schemas';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

export const therapistRouter = Router();

therapistRouter.get('/', listTherapists);
therapistRouter.get('/pending-profiles', authenticate, authorize('ADMIN'), listPendingProfiles);
therapistRouter.get('/:id', authenticateOptional, getTherapist);
therapistRouter.get('/:id/slots', getAvailableSlots);
therapistRouter.put('/:id', authenticate, authorize('THERAPIST', 'ADMIN'), validate(updateProfileSchema), updateProfile);
therapistRouter.put('/:id/availability', authenticate, authorize('THERAPIST', 'ADMIN'), validate(availabilitySchema, 'body'), setAvailability);
therapistRouter.post('/:id/submit-profile', authenticate, authorize('THERAPIST'), submitProfile);
therapistRouter.post('/:id/review-profile', authenticate, authorize('ADMIN'), validate(reviewProfileSchema), reviewProfile);
therapistRouter.post('/:id/gallery', authenticate, authorize('THERAPIST', 'ADMIN'), upload.single('file'), addGalleryImage);
therapistRouter.delete('/:id/gallery/:imageId', authenticate, authorize('THERAPIST', 'ADMIN'), deleteGalleryImage);
therapistRouter.patch('/:id/gallery/reorder', authenticate, authorize('THERAPIST', 'ADMIN'), reorderGalleryImages);
