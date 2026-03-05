import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { translateBatch } from '../controllers/translate.controller';
import { translateBatchSchema } from '../schemas/translate.schemas';

export const translateRouter = Router();

translateRouter.use(authenticate);
translateRouter.post('/batch', validate(translateBatchSchema), translateBatch);
