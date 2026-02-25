import { Router } from 'express';
import {
  listTherapists, getTherapist, getAvailableSlots, updateProfile, setAvailability,
} from '../controllers/therapist.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import { updateProfileSchema, availabilitySchema } from '../schemas/therapist.schemas';

export const therapistRouter = Router();

therapistRouter.get('/', listTherapists);
therapistRouter.get('/:id', getTherapist);
therapistRouter.get('/:id/slots', getAvailableSlots);
therapistRouter.put('/:id', authenticate, authorize('THERAPIST', 'ADMIN'), validate(updateProfileSchema), updateProfile);
therapistRouter.put('/:id/availability', authenticate, authorize('THERAPIST', 'ADMIN'), validate(availabilitySchema, 'body'), setAvailability);
