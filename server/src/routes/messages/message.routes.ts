import { Router } from 'express';
import { messageController } from '../../controllers';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import {
  sendManualMessageSchema,
  listMessagesSchema,
  listConversationsSchema,
  listConversationMessagesSchema,
  sendChatMessageSchema,
} from '../../schemas/message.schemas';
import { rateLimiter } from '../../middleware/rateLimiter';

export const messageRouter = Router();

// All message routes require authentication
messageRouter.use(authenticate);

messageRouter.get('/', validate(listMessagesSchema, 'query'), messageController.getMyMessages);
messageRouter.get('/conversations', validate(listConversationsSchema, 'query'), messageController.getConversations);
messageRouter.get(
  '/conversations/:id',
  validate(listConversationMessagesSchema, 'query'),
  messageController.getConversationMessages,
);
messageRouter.get('/unread-count', messageController.getUnreadCount);
messageRouter.patch('/read-all', messageController.markAllAsRead);
messageRouter.patch('/:id/read', messageController.markAsRead);
messageRouter.post(
  '/chat',
  authorize('MEMBER'),
  rateLimiter(20, 60),
  validate(sendChatMessageSchema),
  messageController.sendChatMessage,
);
messageRouter.post('/', authorize('ADMIN'), validate(sendManualMessageSchema), messageController.sendManualMessage);

