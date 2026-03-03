import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import * as userProfileController from '../controllers/userProfile.controller';
import * as certificateController from '../controllers/certificate.controller';

const router = Router();

router.get('/me', authenticate, userProfileController.getMyProfile);
router.get('/preview', authenticate, userProfileController.previewPublicProfile);
router.get('/:id', userProfileController.getPublicProfile);
router.put('/step/:stepNumber', authenticate, userProfileController.updateProfileStep);
router.post('/submit', authenticate, userProfileController.submitProfile);

router.post('/certificates/apply', authenticate, certificateController.applyCertificate);
router.put('/certificates/:id/upload', authenticate, certificateController.uploadCertificateFiles);
router.get('/certificates/my-applications', authenticate, certificateController.getMyCertificates);

export default router;
