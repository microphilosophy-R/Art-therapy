import { Router } from 'express';
import { getProfile, updateProfile, updatePassword, acceptPrivacy } from '../controllers/profile.controller';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { updateProfileSchema, updatePasswordSchema, acceptPrivacySchema } from '../schemas/user.schemas';

export const profileRouter = Router();

profileRouter.use(authenticate);

profileRouter.get('/', getProfile);
profileRouter.patch('/', validate(updateProfileSchema), updateProfile);
profileRouter.patch('/password', validate(updatePasswordSchema), updatePassword);
profileRouter.post('/privacy-consent', validate(acceptPrivacySchema), acceptPrivacy);
