import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const userCount = await prisma.user.count();
    const planCount = await prisma.therapyPlan.count();
    console.log('Total users:', userCount);
    console.log('Total therapy plans:', planCount);

    if (userCount > 0) {
        const users = await prisma.user.findMany({ take: 5, select: { email: true, role: true } });
        console.log('Sample users:', JSON.stringify(users, null, 2));
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
