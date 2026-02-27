import { prisma } from './src/lib/prisma';

async function inspectPlan() {
    const plan = await prisma.therapyPlan.findUnique({
        where: { id: 'cmm4ks4io000193k8ckx4x345' }
    });
    console.log(JSON.stringify(plan, null, 2));
}

inspectPlan().catch(console.error);
