
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    try {
        const userCount = await prisma.user.count();
        const profileCount = await prisma.therapistProfile.count();
        const planCount = await prisma.therapyPlan.count();
        console.log(`Diagnostic Results:`);
        console.log(`Users: ${userCount}`);
        console.log(`Therapist Profiles: ${profileCount}`);
        console.log(`Therapy Plans: ${planCount}`);

        if (userCount === 0 || profileCount === 0) {
            console.log('Recommendation: The database appears to be empty or missing profiles. Seeding is recommended.');
        } else {
            console.log('Recommendation: Database has data. The 404 might be for a specific missing record or incorrect ID.');
        }
    } catch (e) {
        console.error('Diagnostic failed:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
