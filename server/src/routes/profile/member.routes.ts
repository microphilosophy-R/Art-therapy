import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { memberController } from '../../controllers';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files allowed'));
  },
});

export const memberRouter = Router();

memberRouter.use(authenticate, authorize('MEMBER'));
memberRouter.get('/certificates', memberController.getCertificates);
memberRouter.post('/apply-certificate', upload.array('files', 5), memberController.applyCertificate);
memberRouter.get('/review-status', memberController.getMemberReviewStatus);

