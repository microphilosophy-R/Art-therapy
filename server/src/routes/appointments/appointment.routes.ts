import { Router } from 'express';
import { appointmentController } from '../../controllers';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { requireCertificate } from '../../middleware/requireCertificate';
import { validate } from '../../middleware/validate';
import { createAppointmentSchema, updateStatusSchema, sessionNoteSchema } from '../../schemas/appointment.schemas';

export const appointmentRouter = Router();
const providerCertificates = ['THERAPIST', 'COUNSELOR'] as const;

appointmentRouter.use(authenticate);

appointmentRouter.post('/', authorize('MEMBER'), validate(createAppointmentSchema), appointmentController.createAppointment);
appointmentRouter.get('/', appointmentController.listAppointments);
appointmentRouter.get('/:id', appointmentController.getAppointment);
appointmentRouter.patch('/:id/status', authorize('MEMBER', 'ADMIN'), requireCertificate(providerCertificates), validate(updateStatusSchema), appointmentController.updateAppointmentStatus);
appointmentRouter.delete('/:id', authorize('MEMBER'), appointmentController.cancelAppointment);

appointmentRouter.post('/:id/notes', authorize('MEMBER', 'ADMIN'), requireCertificate(providerCertificates), validate(sessionNoteSchema), appointmentController.createNote);
appointmentRouter.get('/:id/notes', authorize('MEMBER', 'ADMIN'), requireCertificate(providerCertificates), appointmentController.getNote);
appointmentRouter.put('/:id/notes', authorize('MEMBER', 'ADMIN'), requireCertificate(providerCertificates), validate(sessionNoteSchema), appointmentController.createNote);

