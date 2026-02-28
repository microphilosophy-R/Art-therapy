import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const counts = await prisma.therapyPlan.groupBy({
        by: ['status'],
        _count: { _all: true }
    });
    console.log('Therapy Plan counts by status:');
    console.log(JSON.stringify(counts, null, 2));

    const upcomingPlans = await prisma.therapyPlan.count({
        where: {
            OR: [
                { endTime: { gte: new Date() } },
                { AND: [{ endTime: null }, { startTime: { gte: new Date() } }] },
            ]
        }
    });
    console.log('Upcoming plans count:', upcomingPlans);

    const pastPlans = await prisma.therapyPlan.count({
        where: {
            OR: [
                { endTime: { lt: new Date() } },
                { AND: [{ endTime: null }, { startTime: { lt: new Date() } }] },
            ]
        }
    });
    console.log('Past plans count:', pastPlans);
}

main().catch(console.error).finally(() => prisma.$disconnect());
