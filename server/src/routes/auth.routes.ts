import { Router } from 'express';
import { register, login, logout, refresh, getMe } from '../controllers/auth.controller';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { registerSchema, loginSchema } from '../schemas/auth.schemas';

export const authRouter = Router();

authRouter.post('/register', validate(registerSchema), register);
authRouter.post('/login', validate(loginSchema), login);
authRouter.post('/logout', authenticate, logout);
authRouter.post('/refresh', refresh);
authRouter.get('/me', authenticate, getMe);
