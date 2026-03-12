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
 * Send a notification message to every MEMBER when a plan is approved and published.
 */
export const notifyAllClientsOnPlanPublished = async (
  planId: string,
  planTitle: string,
): Promise<void> => {
  const clients = await prisma.user.findMany({
    where: { role: 'MEMBER' },
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
 * Send a notification to admins about a refund request.
 */
export const notifyAdminsOnRefund = async (
  planTitle: string,
  clientName: string,
  refundAmount: number,
): Promise<void> => {
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: { id: true },
  });
  if (admins.length === 0) return;

  await prisma.message.createMany({
    data: admins.map((admin) => ({
      recipientId: admin.id,
      body: `💰 Refund request: ${clientName} cancelled "${planTitle}". Refund amount: ¥${(refundAmount / 100).toFixed(2)}`,
      trigger: 'REFUND_REQUESTED' as const,
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

/**
 * Notify all SIGNED_UP participants that a plan has started.
 */
export const notifyParticipantsPlanStarted = async (
  planId: string,
  planTitle: string,
  participantUserIds: string[],
): Promise<void> => {
  if (participantUserIds.length === 0) return;
  await prisma.message.createMany({
    data: participantUserIds.map((uid) => ({
      recipientId: uid,
      body: `🟢 "${planTitle}" has started. See you there!`,
      trigger: 'PLAN_STARTED' as const,
      planId,
    })),
  });
};

/**
 * Notify all SIGNED_UP participants that a plan has been cancelled by the therapist.
 */
export const notifyParticipantsPlanCancelled = async (
  planId: string,
  planTitle: string,
  participantUserIds: string[],
): Promise<void> => {
  if (participantUserIds.length === 0) return;
  await prisma.message.createMany({
    data: participantUserIds.map((uid) => ({
      recipientId: uid,
      body: `⚠️ "${planTitle}" has been cancelled by the therapist. A refund will be processed if applicable.`,
      trigger: 'PLAN_CANCELLED_BY_THERAPIST' as const,
      planId,
    })),
  });
};

/**
 * Notify the therapist that a client has signed up for their plan.
 */
export const notifyTherapistOnSignup = async (
  therapistUserId: string,
  planId: string,
  planTitle: string,
  clientName: string,
): Promise<void> => {
  await prisma.message.create({
    data: {
      recipientId: therapistUserId,
      body: `✅ ${clientName} signed up for "${planTitle}".`,
      trigger: 'PLAN_SIGNUP',
      planId,
    },
  });
};

/**
 * Notify the therapist that a client has cancelled their sign-up.
 */
export const notifyTherapistOnSignupCancelled = async (
  therapistUserId: string,
  planId: string,
  planTitle: string,
  clientName: string,
): Promise<void> => {
  await prisma.message.create({
    data: {
      recipientId: therapistUserId,
      body: `🚪 ${clientName} cancelled their sign-up for "${planTitle}".`,
      trigger: 'PLAN_SIGNUP_CANCELLED',
      planId,
    },
  });
};

/**
 * Notify all admins that a therapist has submitted their profile for review.
 */
export const notifyAdminsOnProfileSubmitted = async (
  profileId: string,
  therapistName: string,
): Promise<void> => {
  const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
  if (admins.length === 0) return;
  await prisma.message.createMany({
    data: admins.map((admin) => ({
      recipientId: admin.id,
      body: `👤 New therapist profile submitted for review: ${therapistName}`,
      trigger: 'PROFILE_SUBMITTED' as const,
    })),
  });
};

/**
 * Notify the therapist that their profile has been approved.
 */
export const notifyTherapistOnProfileApproved = async (therapistUserId: string): Promise<void> => {
  await prisma.message.create({
    data: {
      recipientId: therapistUserId,
      body: `✅ Your therapist profile has been approved! You are now visible to clients.`,
      trigger: 'PROFILE_APPROVED',
    },
  });
};

/**
 * Notify the therapist that their profile has been rejected.
 */
export const notifyTherapistOnProfileRejected = async (
  therapistUserId: string,
  reason: string,
): Promise<void> => {
  await prisma.message.create({
    data: {
      recipientId: therapistUserId,
      body: `❌ Your therapist profile was not approved. Reason: ${reason}`,
      trigger: 'PROFILE_REJECTED',
    },
  });
};
