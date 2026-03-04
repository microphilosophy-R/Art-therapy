import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const getCalendarEvents = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { include = 'appointments,plans' } = req.query;
  const includeTypes = (include as string).split(',');

  const events: any[] = [];

  if (includeTypes.includes('appointments')) {
    const appointments = await prisma.appointment.findMany({
      where: {
        OR: [{ clientId: userId }, { therapistId: userId }],
        startTime: { gte: new Date() },
      },
      include: { therapist: { include: { user: true } }, client: true },
      orderBy: { startTime: 'asc' },
    });

    events.push(...appointments.map(a => ({
      id: a.id,
      title: `Appointment with ${a.clientId === userId ? a.therapist.user.firstName : a.client.firstName}`,
      startTime: a.startTime,
      endTime: a.endTime,
      type: 'appointment',
      status: a.status,
    })));
  }

  if (includeTypes.includes('plans')) {
    const userProfile = await prisma.userProfile.findUnique({ where: { userId } });
    if (userProfile) {
      const plans = await prisma.therapyPlan.findMany({
        where: {
          OR: [
            { userProfileId: userProfile.id },
            { participants: { some: { userId } } },
          ],
          startTime: { gte: new Date() },
        },
        orderBy: { startTime: 'asc' },
      });

      events.push(...plans.map(p => ({
        id: p.id,
        title: p.title,
        startTime: p.startTime,
        endTime: p.endTime,
        type: 'plan',
        status: p.status,
      })));
    }
  }

  res.json(events.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()));
};
