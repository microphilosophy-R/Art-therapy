import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { getDashboardStats } from '../controllers/stats.controller';

export const statsRouter = Router();

statsRouter.use(authenticate);
statsRouter.get('/dashboard', getDashboardStats);
