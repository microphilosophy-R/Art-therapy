import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import { ArtistController } from '../controllers/artist.controller';

const router = Router();

// Protected routes (ARTIST only) — listed before /:id to avoid shadowing
router.get('/me', authenticate, authorize('ARTIST'), ArtistController.getMyProfile);
router.put('/me', authenticate, authorize('ARTIST'), validate(ArtistController.updateProfileSchema), ArtistController.updateProfile);
router.post('/me/submit', authenticate, authorize('ARTIST'), ArtistController.submitForReview);

// Public profile lookup by artist profile ID
router.get('/:id', ArtistController.getPublicProfile);

export { router as artistRouter };
