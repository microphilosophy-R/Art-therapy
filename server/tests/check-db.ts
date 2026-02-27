import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDb() {
    console.log('--- Checking Database Status ---');
    try {
        const plans = await prisma.therapyPlan.findMany({
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: { images: true }
        });

        if (plans.length === 0) {
            console.log('No therapy plans found.');
            return;
        }

        const plan = plans[0];
        console.log(`Latest Plan: ${plan.id} (${plan.title}) at ${plan.createdAt}`);
        console.log(`Images count: ${plan.images.length}`);

        plan.images.forEach((img, i) => {
            console.log(`  Image ${i + 1}: id=${img.id}, url="${img.url}", order=${img.order}`);
        });

    } catch (err) {
        console.error('Database check FAILED:', err);
    } finally {
        await prisma.$disconnect();
    }
}

checkDb();
