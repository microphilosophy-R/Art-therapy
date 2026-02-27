import { prisma } from './src/lib/prisma';

async function checkConflicts() {
    console.log('--- Comprehensive Schedule Conflict Check ---');

    const therapists = await prisma.therapistProfile.findMany({
        include: { user: true }
    });

    for (const t of therapists) {
        console.log(`\nTherapist: ${t.user.firstName} ${t.user.lastName} (ID: ${t.id})`);

        const activePlans = await prisma.therapyPlan.findMany({
            where: {
                therapistId: t.id,
                status: { in: ['PUBLISHED', 'SIGN_UP_CLOSED', 'IN_PROGRESS'] }
            },
            select: { id: true, title: true, status: true, startTime: true, endTime: true }
        });

        console.log('  Active Plans:');
        if (activePlans.length === 0) {
            console.log('    None');
        } else {
            activePlans.forEach(p => {
                console.log(`    - [${p.status}] ${p.title} (${p.id})`);
                console.log(`      ${p.startTime.toISOString()} -> ${p.endTime ? p.endTime.toISOString() : 'OPEN'}`);
            });
        }

        const activeAppts = await prisma.appointment.findMany({
            where: {
                therapistId: t.id,
                status: { in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS'] }
            },
            select: { id: true, status: true, startTime: true, endTime: true }
        });

        console.log('  Active Appointments:');
        if (activeAppts.length === 0) {
            console.log('    None');
        } else {
            activeAppts.forEach(a => {
                console.log(`    - [${a.status}] (${a.id})`);
                console.log(`      ${a.startTime.toISOString()} -> ${a.endTime.toISOString()}`);
            });
        }
    }
}

checkConflicts().catch(console.error);
