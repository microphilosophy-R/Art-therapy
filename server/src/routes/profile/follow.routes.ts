import { Router } from 'express';
import { followController } from '../../controllers';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { followTargetParamsSchema, listMyFollowsSchema } from '../../schemas/follow.schemas';

export const followRouter = Router();

followRouter.use(authenticate);
followRouter.use(authorize('MEMBER'));

followRouter.post('/:userId', validate(followTargetParamsSchema, 'params'), followController.followUser);
followRouter.delete('/:userId', validate(followTargetParamsSchema, 'params'), followController.unfollowUser);
followRouter.get('/me', validate(listMyFollowsSchema, 'query'), followController.listMyFollows);
followRouter.get('/status/:userId', validate(followTargetParamsSchema, 'params'), followController.getFollowStatus);

