import { Router } from 'express';
import {
  followUser,
  unfollowUser,
  listMyFollows,
  getFollowStatus,
} from '../controllers/follow.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import { followTargetParamsSchema, listMyFollowsSchema } from '../schemas/follow.schemas';

export const followRouter = Router();

followRouter.use(authenticate);
followRouter.use(authorize('MEMBER'));

followRouter.post('/:userId', validate(followTargetParamsSchema, 'params'), followUser);
followRouter.delete('/:userId', validate(followTargetParamsSchema, 'params'), unfollowUser);
followRouter.get('/me', validate(listMyFollowsSchema, 'query'), listMyFollows);
followRouter.get('/status/:userId', validate(followTargetParamsSchema, 'params'), getFollowStatus);
