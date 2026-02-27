import { Router } from 'express';
import {
  getMyMessages,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  sendManualMessage,
} from '../controllers/message.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import { sendManualMessageSchema, listMessagesSchema } from '../schemas/message.schemas';

export const messageRouter = Router();

// All message routes require authentication
messageRouter.use(authenticate);

messageRouter.get('/', validate(listMessagesSchema, 'query'), getMyMessages);
messageRouter.get('/unread-count', getUnreadCount);
messageRouter.patch('/read-all', markAllAsRead);
messageRouter.patch('/:id/read', markAsRead);
messageRouter.post('/', authorize('ADMIN'), validate(sendManualMessageSchema), sendManualMessage);
