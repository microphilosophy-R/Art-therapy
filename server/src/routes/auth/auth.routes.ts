import { Router } from 'express';
import { authController } from '../../controllers';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import { registerSchema, loginSchema } from '../../schemas/auth.schemas';

export const authRouter = Router();

authRouter.post('/register', validate(registerSchema), authController.register);
authRouter.post('/login', validate(loginSchema), authController.login);
authRouter.post('/logout', authenticate, authController.logout);
authRouter.post('/refresh', authController.refresh);
authRouter.get('/me', authenticate, authController.getMe);

