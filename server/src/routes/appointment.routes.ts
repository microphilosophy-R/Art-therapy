import { Router } from 'express';
import {
  createAppointment, listAppointments, getAppointment,
  cancelAppointment, updateAppointmentStatus, createNote, getNote,
} from '../controllers/appointment.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { requireCertificate } from '../middleware/requireCertificate';
import { validate } from '../middleware/validate';
import { createAppointmentSchema, updateStatusSchema, sessionNoteSchema } from '../schemas/appointment.schemas';

export const appointmentRouter = Router();

appointmentRouter.use(authenticate);

appointmentRouter.post('/', authorize('MEMBER'), validate(createAppointmentSchema), createAppointment);
appointmentRouter.get('/', listAppointments);
appointmentRouter.get('/:id', getAppointment);
appointmentRouter.patch('/:id/status', authorize('MEMBER', 'ADMIN'), requireCertificate('THERAPIST'), validate(updateStatusSchema), updateAppointmentStatus);
appointmentRouter.delete('/:id', authorize('MEMBER'), cancelAppointment);

appointmentRouter.post('/:id/notes', authorize('MEMBER', 'ADMIN'), requireCertificate('THERAPIST'), validate(sessionNoteSchema), createNote);
appointmentRouter.get('/:id/notes', authorize('MEMBER', 'ADMIN'), requireCertificate('THERAPIST'), getNote);
appointmentRouter.put('/:id/notes', authorize('MEMBER', 'ADMIN'), requireCertificate('THERAPIST'), validate(sessionNoteSchema), createNote);
