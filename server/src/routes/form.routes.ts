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
import { requireCertificate } from '../middleware/requireCertificate';
import { validate } from '../middleware/validate';
import { createFormSchema, submitFormSchema } from '../schemas/form.schemas';

export const formRouter = Router();

formRouter.use(authenticate);

// Therapist + Admin: manage forms
formRouter.post('/', authorize('MEMBER', 'ADMIN'), requireCertificate('THERAPIST'), validate(createFormSchema), createForm);
formRouter.get('/sent', authorize('MEMBER', 'ADMIN'), requireCertificate('THERAPIST'), listSentForms);
formRouter.get('/:id/detail', authorize('MEMBER', 'ADMIN'), requireCertificate('THERAPIST'), getFormWithResponses);
formRouter.patch('/:id/send', authorize('MEMBER', 'ADMIN'), requireCertificate('THERAPIST'), sendForm);
formRouter.patch('/:id/archive', authorize('MEMBER', 'ADMIN'), requireCertificate('THERAPIST'), archiveForm);

// Client: view and submit forms
formRouter.get('/received', authorize('MEMBER'), listReceivedForms);
formRouter.get('/:id', authorize('MEMBER'), getFormForClient);
formRouter.post('/:id/submit', authorize('MEMBER'), validate(submitFormSchema), submitForm);
