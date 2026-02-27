import { prisma } from '../lib/prisma';

/**
 * Send a notification message to every ADMIN when a therapist submits a plan for review.
 */
export const notifyAdminsOnPlanSubmitted = async (
  planId: string,
  planTitle: string,
  therapistName: string,
): Promise<void> => {
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: { id: true },
  });
  if (admins.length === 0) return;

  await prisma.message.createMany({
    data: admins.map((admin) => ({
      recipientId: admin.id,
      body: `📋 New plan submitted for review: "${planTitle}" by ${therapistName}`,
      trigger: 'PLAN_SUBMITTED' as const,
      planId,
    })),
  });
};

/**
 * Send a notification message to every CLIENT when a plan is approved and published.
 */
export const notifyAllClientsOnPlanPublished = async (
  planId: string,
  planTitle: string,
): Promise<void> => {
  const clients = await prisma.user.findMany({
    where: { role: 'CLIENT' },
    select: { id: true },
  });
  if (clients.length === 0) return;

  await prisma.message.createMany({
    data: clients.map((client) => ({
      recipientId: client.id,
      body: `🎨 A new therapy plan is now available: "${planTitle}"`,
      trigger: 'PLAN_APPROVED' as const,
      planId,
    })),
  });
};

/**
 * Send a notification message to the therapist when their plan is rejected.
 */
export const notifyTherapistOnRejection = async (
  therapistUserId: string,
  planId: string,
  planTitle: string,
  reason: string,
): Promise<void> => {
  await prisma.message.create({
    data: {
      recipientId: therapistUserId,
      body: `❌ Your plan "${planTitle}" was not approved. Reason: ${reason}`,
      trigger: 'PLAN_REJECTED',
      planId,
    },
  });
};
