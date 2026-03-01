import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import { ArtistController } from '../controllers/artist.controller';

const router = Router();

router.use(authenticate);
router.use(authorize('ARTIST'));

router.get('/me', ArtistController.getMyProfile);
router.put('/me', validate(ArtistController.updateProfileSchema), ArtistController.updateProfile);
router.post('/me/submit', ArtistController.submitForReview);

export { router as artistRouter };
