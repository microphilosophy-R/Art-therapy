import { prisma } from './src/lib/prisma';

const CONFLICT_PLAN_STATUSES = ['PUBLISHED', 'SIGN_UP_CLOSED', 'IN_PROGRESS'] as const;

async function simulateConflictCheck() {
    const therapistId = 'cmm1ovqe90007s0zac9gx2juz'; // Sarah Chen
    const startTime = new Date('2026-02-26T16:08:00');
    const endTime = new Date('2026-02-26T17:08:00');
    const excludePlanId = 'cmm4yx1700001zbs3ccpmnoj8';

    console.log(`Simulating check for Plan ${excludePlanId} at ${startTime.toISOString()}`);

    const slotEnd = endTime ?? startTime;

    const planOverlapsClause = {
        AND: [
            { startTime: { lt: slotEnd } },
            {
                OR: [
                    { endTime: null },
                    { endTime: { gt: startTime } },
                ],
            },
        ],
    };

    const conflictingPlans = await prisma.therapyPlan.findMany({
        where: {
            therapistId,
            status: { in: CONFLICT_PLAN_STATUSES as any },
            id: excludePlanId ? { not: excludePlanId } : undefined,
            ...planOverlapsClause,
        },
        select: { id: true, title: true, startTime: true, type: true },
    });

    console.log('Results:', JSON.stringify(conflictingPlans, null, 2));
}

simulateConflictCheck().catch(console.error);
