import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { statsController } from '../../controllers';

export const statsRouter = Router();

statsRouter.use(authenticate);
statsRouter.get('/dashboard', statsController.getDashboardStats);

