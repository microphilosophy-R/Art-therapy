import { prisma } from './src/lib/prisma';

async function dumpRecords() {
    console.log('--- Dumping All Relevant Records ---');

    const therapists = await prisma.therapistProfile.findMany({
        include: { user: true }
    });

    for (const t of therapists) {
        console.log(`\nTherapist: ${t.user.firstName} ${t.user.lastName} (${t.id})`);

        console.log('  Plans:');
        const plans = await prisma.therapyPlan.findMany({
            where: { therapistId: t.id },
            select: { id: true, title: true, status: true, startTime: true, endTime: true }
        });
        plans.forEach(p => {
            console.log(`    - [${p.status}] ${p.title.padEnd(30)} ${p.startTime.toISOString()} -> ${p.endTime ? p.endTime.toISOString() : 'OPEN'}`);
        });

        console.log('  Appointments:');
        const appts = await prisma.appointment.findMany({
            where: { therapistId: t.id },
            select: { id: true, status: true, startTime: true, endTime: true }
        });
        appts.forEach(a => {
            console.log(`    - [${a.status}] ${a.startTime.toISOString()} -> ${a.endTime.toISOString()}`);
        });
    }
}

dumpRecords().catch(console.error);
