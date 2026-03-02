import 'dotenv/config';
import { CertificateStatus, CertificateType, PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

type IdMap = Map<string, string>;

async function ensureUserProfiles(nonAdminUserIds: string[]) {
  const existing = await prisma.userProfile.findMany({
    where: { userId: { in: nonAdminUserIds } },
    select: { userId: true },
  });

  const existingSet = new Set(existing.map((p) => p.userId));
  const missingUserIds = nonAdminUserIds.filter((id) => !existingSet.has(id));

  if (missingUserIds.length > 0) {
    await prisma.userProfile.createMany({
      data: missingUserIds.map((userId) => ({ userId })),
      skipDuplicates: true,
    });
  }

  return { createdProfiles: missingUserIds.length };
}

async function backfillCertificates(profileByUserId: IdMap) {
  const now = new Date();

  const [legacyTherapists, legacyArtists] = await Promise.all([
    prisma.therapistProfile.findMany({ select: { userId: true } }),
    prisma.artistProfile.findMany({ select: { userId: true } }),
  ]);

  let therapistGranted = 0;
  let artificerGranted = 0;
  let skippedMissingProfile = 0;

  for (const row of legacyTherapists) {
    const profileId = profileByUserId.get(row.userId);
    if (!profileId) {
      skippedMissingProfile += 1;
      continue;
    }

    await prisma.userCertificate.upsert({
      where: { profileId_type: { profileId, type: CertificateType.THERAPIST } },
      update: { status: CertificateStatus.APPROVED, reviewedAt: now },
      create: { profileId, type: CertificateType.THERAPIST, status: CertificateStatus.APPROVED, reviewedAt: now },
    });
    therapistGranted += 1;
  }

  for (const row of legacyArtists) {
    const profileId = profileByUserId.get(row.userId);
    if (!profileId) {
      skippedMissingProfile += 1;
      continue;
    }

    await prisma.userCertificate.upsert({
      where: { profileId_type: { profileId, type: CertificateType.ARTIFICER } },
      update: { status: CertificateStatus.APPROVED, reviewedAt: now },
      create: { profileId, type: CertificateType.ARTIFICER, status: CertificateStatus.APPROVED, reviewedAt: now },
    });
    artificerGranted += 1;
  }

  return {
    therapistGranted,
    artificerGranted,
    skippedMissingProfile,
  };
}

async function backfillUnifiedForeignKeys(profileByTherapistId: IdMap, profileByArtistId: IdMap) {
  let updated = 0;

  const therapistMappings = [...profileByTherapistId.entries()];
  for (const [legacyId, profileId] of therapistMappings) {
    const [appointments, availability, reviews, refundPolicies, galleryImages, therapyPlans] = await Promise.all([
      prisma.appointment.updateMany({ where: { therapistId: legacyId, userProfileId: null }, data: { userProfileId: profileId } }),
      prisma.availability.updateMany({ where: { therapistId: legacyId, userProfileId: null }, data: { userProfileId: profileId } }),
      prisma.review.updateMany({ where: { therapistId: legacyId, userProfileId: null }, data: { userProfileId: profileId } }),
      prisma.refundPolicy.updateMany({ where: { therapistId: legacyId, userProfileId: null }, data: { userProfileId: profileId } }),
      prisma.galleryImage.updateMany({ where: { therapistId: legacyId, userProfileId: null }, data: { userProfileId: profileId } }),
      prisma.therapyPlan.updateMany({ where: { therapistId: legacyId, userProfileId: null }, data: { userProfileId: profileId } }),
    ]);

    updated += appointments.count + availability.count + reviews.count + refundPolicies.count + galleryImages.count + therapyPlans.count;
  }

  const artistMappings = [...profileByArtistId.entries()];
  for (const [legacyId, profileId] of artistMappings) {
    const products = await prisma.product.updateMany({
      where: { artistId: legacyId, userProfileId: null },
      data: { userProfileId: profileId },
    });
    updated += products.count;
  }

  return { bridgeRowsUpdated: updated };
}

async function main() {
  console.log('[backfill-member-certs] Starting backfill...');

  const nonAdminUsers = await prisma.user.findMany({
    where: { role: { not: Role.ADMIN } },
    select: { id: true, role: true, email: true },
  });

  const nonAdminUserIds = nonAdminUsers.map((u) => u.id);

  const roleUpdate = await prisma.user.updateMany({
    where: { role: { not: Role.ADMIN } },
    data: { role: Role.MEMBER },
  });

  const { createdProfiles } = await ensureUserProfiles(nonAdminUserIds);

  const allProfiles = await prisma.userProfile.findMany({
    where: { userId: { in: nonAdminUserIds } },
    select: { id: true, userId: true },
  });

  const profileByUserId: IdMap = new Map(allProfiles.map((p) => [p.userId, p.id]));

  const certSummary = await backfillCertificates(profileByUserId);

  const [therapists, artists] = await Promise.all([
    prisma.therapistProfile.findMany({ select: { id: true, userId: true } }),
    prisma.artistProfile.findMany({ select: { id: true, userId: true } }),
  ]);

  const profileByTherapistId: IdMap = new Map();
  for (const row of therapists) {
    const userProfileId = profileByUserId.get(row.userId);
    if (userProfileId) profileByTherapistId.set(row.id, userProfileId);
  }

  const profileByArtistId: IdMap = new Map();
  for (const row of artists) {
    const userProfileId = profileByUserId.get(row.userId);
    if (userProfileId) profileByArtistId.set(row.id, userProfileId);
  }

  const bridgeSummary = await backfillUnifiedForeignKeys(profileByTherapistId, profileByArtistId);

  const missingProfiles = nonAdminUsers.filter((u) => !profileByUserId.has(u.id));

  console.log('[backfill-member-certs] Complete. Summary:');
  console.log(JSON.stringify({
    nonAdminUsers: nonAdminUsers.length,
    rolesForcedToMember: roleUpdate.count,
    createdProfiles,
    therapistCertUpserts: certSummary.therapistGranted,
    artificerCertUpserts: certSummary.artificerGranted,
    skippedMissingProfileForCert: certSummary.skippedMissingProfile,
    bridgeRowsUpdated: bridgeSummary.bridgeRowsUpdated,
    missingProfilesAfterBackfill: missingProfiles.length,
  }, null, 2));
}

main()
  .catch((err) => {
    console.error('[backfill-member-certs] Failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
