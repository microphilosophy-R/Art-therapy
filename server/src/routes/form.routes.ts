import { Router } from 'express';
import {
  createForm,
  sendForm,
  listSentForms,
  getFormWithResponses,
  archiveForm,
  listReceivedForms,
  getFormForClient,
  submitForm,
} from '../controllers/form.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import { createFormSchema, submitFormSchema } from '../schemas/form.schemas';

export const formRouter = Router();

formRouter.use(authenticate);

// Therapist + Admin: manage forms
formRouter.post('/', authorize('THERAPIST', 'ADMIN'), validate(createFormSchema), createForm);
formRouter.get('/sent', authorize('THERAPIST', 'ADMIN'), listSentForms);
formRouter.get('/:id/detail', authorize('THERAPIST', 'ADMIN'), getFormWithResponses);
formRouter.patch('/:id/send', authorize('THERAPIST', 'ADMIN'), sendForm);
formRouter.patch('/:id/archive', authorize('THERAPIST', 'ADMIN'), archiveForm);

// Client: view and submit forms
formRouter.get('/received', authorize('CLIENT'), listReceivedForms);
formRouter.get('/:id', authorize('CLIENT'), getFormForClient);
formRouter.post('/:id/submit', authorize('CLIENT'), validate(submitFormSchema), submitForm);
