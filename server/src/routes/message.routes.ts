import { Router } from 'express';
import {
  getMyMessages,
  getConversations,
  getConversationMessages,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  sendChatMessage,
  sendManualMessage,
} from '../controllers/message.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import {
  sendManualMessageSchema,
  listMessagesSchema,
  listConversationsSchema,
  listConversationMessagesSchema,
  sendChatMessageSchema,
} from '../schemas/message.schemas';
import { rateLimiter } from '../middleware/rateLimiter';

export const messageRouter = Router();

// All message routes require authentication
messageRouter.use(authenticate);

messageRouter.get('/', validate(listMessagesSchema, 'query'), getMyMessages);
messageRouter.get('/conversations', validate(listConversationsSchema, 'query'), getConversations);
messageRouter.get(
  '/conversations/:id',
  validate(listConversationMessagesSchema, 'query'),
  getConversationMessages,
);
messageRouter.get('/unread-count', getUnreadCount);
messageRouter.patch('/read-all', markAllAsRead);
messageRouter.patch('/:id/read', markAsRead);
messageRouter.post(
  '/chat',
  authorize('MEMBER'),
  rateLimiter(20, 60),
  validate(sendChatMessageSchema),
  sendChatMessage,
);
messageRouter.post('/', authorize('ADMIN'), validate(sendManualMessageSchema), sendManualMessage);
