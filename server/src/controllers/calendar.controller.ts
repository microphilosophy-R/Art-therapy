import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const getCalendarEvents = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { include = 'appointments,plans', from, to } = req.query;
  const includeSet = new Set(
    String(include)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );
  const includeAppointments = includeSet.size === 0 || includeSet.has('appointments');
  const includePlans = includeSet.size === 0 || includeSet.has('plans');

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const defaultFrom = new Date(monthStart);
  defaultFrom.setDate(defaultFrom.getDate() - 30);
  const defaultTo = new Date(monthEnd);
  defaultTo.setDate(defaultTo.getDate() + 90);

  const parsedFrom = from ? new Date(String(from)) : defaultFrom;
  const parsedTo = to ? new Date(String(to)) : defaultTo;
  const safeFrom = Number.isNaN(parsedFrom.getTime()) ? defaultFrom : parsedFrom;
  const safeTo = Number.isNaN(parsedTo.getTime()) ? defaultTo : parsedTo;
  const rangeFrom = safeFrom <= safeTo ? safeFrom : safeTo;
  const rangeTo = safeFrom <= safeTo ? safeTo : safeFrom;

  const events: any[] = [];
  const myProfile = await prisma.userProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (includeAppointments) {
    const appointments = await prisma.appointment.findMany({
      where: {
        OR: [
          { clientId: userId },
          ...(myProfile?.id ? [{ userProfileId: myProfile.id }] : []),
        ],
        startTime: { lt: rangeTo },
        endTime: { gte: rangeFrom },
      },
      include: { userProfile: { include: { user: true } }, client: true },
      orderBy: { startTime: 'asc' },
    });

    events.push(...appointments.map((a) => ({
      id: a.id,
      title: `Appointment with ${
        a.clientId === userId ? (a.userProfile?.user?.firstName ?? 'Provider') : a.client.firstName
      }`,
      startTime: a.startTime,
      endTime: a.endTime,
      type: 'appointment',
      status: a.status,
      medium: a.medium,
    })));
  }

  if (includePlans) {
    const plans = await prisma.therapyPlan.findMany({
      where: {
        status: {
          in: ['PUBLISHED', 'SIGN_UP_CLOSED', 'IN_PROGRESS', 'FINISHED', 'CANCELLED'],
        },
        startTime: { lt: rangeTo },
        AND: [
          {
            OR: [
              ...(myProfile?.id ? [{ userProfileId: myProfile.id }] : []),
              { participants: { some: { userId } } },
            ],
          },
          {
            OR: [
              { endTime: { gte: rangeFrom } },
              {
                AND: [
                  { endTime: null },
                  { startTime: { gte: rangeFrom } },
                ],
              },
            ],
          },
        ],
      },
      orderBy: { startTime: 'asc' },
    });

    events.push(...plans.map((p) => ({
      id: p.id,
      title: p.title,
      startTime: p.startTime,
      endTime: p.endTime,
      type: 'plan',
      status: p.status,
      planType: p.type,
    })));
  }

  res.json(events.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()));
};
