import { Router } from 'express';
import { formController } from '../../controllers';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { requireCertificate } from '../../middleware/requireCertificate';
import { validate } from '../../middleware/validate';
import { createFormSchema, submitFormSchema } from '../../schemas/form.schemas';

export const formRouter = Router();

formRouter.use(authenticate);

// Therapist + Admin: manage forms
formRouter.post('/', authorize('MEMBER', 'ADMIN'), requireCertificate('THERAPIST'), validate(createFormSchema), formController.createForm);
formRouter.get('/sent', authorize('MEMBER', 'ADMIN'), requireCertificate('THERAPIST'), formController.listSentForms);
formRouter.get('/:id/detail', authorize('MEMBER', 'ADMIN'), requireCertificate('THERAPIST'), formController.getFormWithResponses);
formRouter.patch('/:id/send', authorize('MEMBER', 'ADMIN'), requireCertificate('THERAPIST'), formController.sendForm);
formRouter.patch('/:id/archive', authorize('MEMBER', 'ADMIN'), requireCertificate('THERAPIST'), formController.archiveForm);

// Client: view and submit forms
formRouter.get('/received', authorize('MEMBER'), formController.listReceivedForms);
formRouter.get('/:id', authorize('MEMBER'), formController.getFormForClient);
formRouter.post('/:id/submit', authorize('MEMBER'), validate(submitFormSchema), formController.submitForm);

