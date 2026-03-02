import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { applyCertificate, getCertificates } from '../controllers/member.controller';

export const memberRouter = Router();

memberRouter.use(authenticate, authorize('MEMBER'));
memberRouter.get('/certificates', getCertificates);
memberRouter.post('/certificates', applyCertificate);
