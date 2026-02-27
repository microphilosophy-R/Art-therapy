import { prisma } from './src/lib/prisma';

async function checkDetails() {
    const plan = await prisma.therapyPlan.findUnique({
        where: { id: 'cmm4yx1700001zbs3ccpmnoj8' },
        select: { id: true, therapistId: true, startTime: true, endTime: true, status: true, title: true }
    });
    console.log('Draft Plan Details:', JSON.stringify(plan, null, 2));
}

checkDetails().catch(console.error);
