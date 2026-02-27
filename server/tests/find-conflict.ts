import { prisma } from './src/lib/prisma';

async function findConflict() {
    console.log('--- Finding Specific Conflict ---');

    const targetStart = new Date('2026-02-26T16:08:00');
    const targetEnd = new Date('2026-02-26T17:08:00');

    const conflictingPlans = await prisma.therapyPlan.findMany({
        where: {
            status: { in: ['PUBLISHED', 'SIGN_UP_CLOSED', 'IN_PROGRESS'] },
            startTime: { lt: targetEnd },
            OR: [
                { endTime: null },
                { endTime: { gt: targetStart } }
            ]
        },
        include: { therapist: { include: { user: true } } }
    });

    console.log(`\nFound ${conflictingPlans.length} potentially conflicting plans for the target window:`);
    conflictingPlans.forEach(p => {
        console.log(`- [${p.status}] ${p.title} (${p.id})`);
        console.log(`  Therapist: ${p.therapist.user.firstName} ${p.therapist.user.lastName}`);
        console.log(`  Time: ${p.startTime.toISOString()} -> ${p.endTime ? p.endTime.toISOString() : 'OPEN'}`);
    });

    const conflictingAppts = await prisma.appointment.findMany({
        where: {
            status: { in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS'] },
            startTime: { lt: targetEnd },
            endTime: { gt: targetStart }
        },
        include: { therapist: { include: { user: true } } }
    });

    console.log(`\nFound ${conflictingAppts.length} potentially conflicting appointments:`);
    conflictingAppts.forEach(a => {
        console.log(`- [${a.status}] (${a.id})`);
        console.log(`  Therapist: ${a.therapist.user.firstName} ${a.therapist.user.lastName}`);
        console.log(`  Time: ${a.startTime.toISOString()} -> ${a.endTime.toISOString()}`);
    });
}

findConflict().catch(console.error);
