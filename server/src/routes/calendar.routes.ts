import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { getCalendarEvents } from '../controllers/calendar.controller';

export const calendarRouter = Router();

calendarRouter.use(authenticate);
calendarRouter.get('/events', getCalendarEvents);
