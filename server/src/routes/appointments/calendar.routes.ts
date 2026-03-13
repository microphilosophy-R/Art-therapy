import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { calendarController } from '../../controllers';

export const calendarRouter = Router();

calendarRouter.use(authenticate);
calendarRouter.get('/events', calendarController.getCalendarEvents);

