/// <reference types="node" />
import 'dotenv/config';
import { PrismaClient, Role, SessionMedium, AppointmentStatus, TherapyPlanType, ArtSalonSubType, TherapyPlanStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Users ────────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@arttherapy.dev' },
    update: {},
    create: {
      email: 'admin@arttherapy.dev',
      passwordHash,
      role: Role.ADMIN,
      firstName: 'Admin',
      lastName: 'User',
    },
  });

  const client1 = await prisma.user.upsert({
    where: { email: 'client@arttherapy.dev' },
    update: {},
    create: {
      email: 'client@arttherapy.dev',
      passwordHash,
      role: Role.CLIENT,
      firstName: 'Alex',
      lastName: 'Rivera',
      phone: '+1 555-0101',
    },
  });

  const client2 = await prisma.user.upsert({
    where: { email: 'client2@arttherapy.dev' },
    update: {},
    create: {
      email: 'client2@arttherapy.dev',
      passwordHash,
      role: Role.CLIENT,
      firstName: 'Jordan',
      lastName: 'Kim',
    },
  });

  const therapist1User = await prisma.user.upsert({
    where: { email: 'therapist@arttherapy.dev' },
    update: {},
    create: {
      email: 'therapist@arttherapy.dev',
      passwordHash,
      role: Role.THERAPIST,
      firstName: 'Dr. Sarah',
      lastName: 'Chen',
      phone: '+1 555-0202',
    },
  });

  const therapist2User = await prisma.user.upsert({
    where: { email: 'therapist2@arttherapy.dev' },
    update: {},
    create: {
      email: 'therapist2@arttherapy.dev',
      passwordHash,
      role: Role.THERAPIST,
      firstName: 'Marcus',
      lastName: 'Webb',
    },
  });

  const therapist3User = await prisma.user.upsert({
    where: { email: 'therapist3@arttherapy.dev' },
    update: {},
    create: {
      email: 'therapist3@arttherapy.dev',
      passwordHash,
      role: Role.THERAPIST,
      firstName: 'Priya',
      lastName: 'Patel',
    },
  });

  console.log('✓ Users created');

  // ─── Therapist Profiles ───────────────────────────────────────────────────
  const profile1 = await prisma.therapistProfile.upsert({
    where: { userId: therapist1User.id },
    update: {},
    create: {
      userId: therapist1User.id,
      bio: 'I am a licensed art therapist with over 10 years of experience helping clients process trauma and anxiety through creative expression. My approach integrates traditional talk therapy with painting, drawing, and mixed media to help clients access emotions that words sometimes cannot reach.',
      specialties: ['Trauma', 'Anxiety', 'PTSD'],
      sessionPrice: 120.00,
      sessionLength: 60,
      locationCity: 'San Francisco, CA',
      isAccepting: true,
      rating: 4.9,
    },
  });

  const profile2 = await prisma.therapistProfile.upsert({
    where: { userId: therapist2User.id },
    update: {},
    create: {
      userId: therapist2User.id,
      bio: 'Specializing in grief counseling and life transitions, I use art therapy to help adults and children navigate loss. With a background in psychology and fine arts, I create a safe space for emotional exploration through sculpture, collage, and painting.',
      specialties: ['Grief', 'Depression', 'Children'],
      sessionPrice: 95.00,
      sessionLength: 50,
      locationCity: 'Austin, TX',
      isAccepting: true,
      rating: 4.7,
    },
  });

  const profile3 = await prisma.therapistProfile.upsert({
    where: { userId: therapist3User.id },
    update: {},
    create: {
      userId: therapist3User.id,
      bio: 'I work with couples and individuals experiencing relationship challenges using art-based interventions to improve communication and deepen emotional connection. My sessions combine mindfulness practices with creative exploration.',
      specialties: ['Couples', 'Stress', 'Anxiety'],
      sessionPrice: 150.00,
      sessionLength: 90,
      locationCity: 'New York, NY',
      isAccepting: true,
      rating: 4.8,
    },
  });

  console.log('✓ Therapist profiles created');

  // ─── Availability ─────────────────────────────────────────────────────────
  // Dr. Sarah Chen: Mon-Fri 9am-5pm
  const days1 = [1, 2, 3, 4, 5];
  for (const day of days1) {
    await prisma.availability.upsert({
      where: { id: `avail-${profile1.id}-${day}` },
      update: {},
      create: {
        id: `avail-${profile1.id}-${day}`,
        therapistId: profile1.id,
        dayOfWeek: day,
        startTime: '09:00',
        endTime: '17:00',
      },
    });
  }

  // Marcus Webb: Mon/Wed/Fri 10am-6pm
  for (const day of [1, 3, 5]) {
    await prisma.availability.upsert({
      where: { id: `avail-${profile2.id}-${day}` },
      update: {},
      create: {
        id: `avail-${profile2.id}-${day}`,
        therapistId: profile2.id,
        dayOfWeek: day,
        startTime: '10:00',
        endTime: '18:00',
      },
    });
  }

  // Priya Patel: Tue/Thu/Sat 8am-4pm
  for (const day of [2, 4, 6]) {
    await prisma.availability.upsert({
      where: { id: `avail-${profile3.id}-${day}` },
      update: {},
      create: {
        id: `avail-${profile3.id}-${day}`,
        therapistId: profile3.id,
        dayOfWeek: day,
        startTime: '08:00',
        endTime: '16:00',
      },
    });
  }

  console.log('✓ Availability created');

  // ─── Refund Policies ──────────────────────────────────────────────────────
  await prisma.refundPolicy.upsert({
    where: { therapistId: profile1.id },
    update: {},
    create: {
      therapistId: profile1.id,
      fullRefundHoursThreshold: 24,
      allowPartialRefund: true,
      partialRefundPercent: 50,
      policyDescription: 'Full refund if cancelled 24+ hours before session. 50% refund if cancelled within 24 hours.',
    },
  });

  await prisma.refundPolicy.upsert({
    where: { therapistId: profile2.id },
    update: {},
    create: {
      therapistId: profile2.id,
      fullRefundHoursThreshold: 48,
      allowPartialRefund: false,
      policyDescription: 'Full refund if cancelled 48+ hours before session. No refund within 48 hours.',
    },
  });

  await prisma.refundPolicy.upsert({
    where: { therapistId: profile3.id },
    update: {},
    create: {
      therapistId: profile3.id,
      fullRefundHoursThreshold: 24,
      allowPartialRefund: false,
      policyDescription: 'Full refund if cancelled at least 24 hours before the session.',
    },
  });

  console.log('✓ Refund policies created');

  // ─── Reviews ──────────────────────────────────────────────────────────────
  await prisma.review.createMany({
    skipDuplicates: true,
    data: [
      {
        clientId: client1.id,
        therapistId: profile1.id,
        rating: 5,
        comment: 'Dr. Chen has been incredibly helpful. The art therapy approach allowed me to express things I could not put into words. Highly recommend.',
      },
      {
        clientId: client2.id,
        therapistId: profile1.id,
        rating: 5,
        comment: 'Outstanding therapist. I have seen remarkable progress in managing my anxiety through her sessions.',
      },
      {
        clientId: client1.id,
        therapistId: profile2.id,
        rating: 4,
        comment: 'Marcus is compassionate and patient. The grief work we did through collage was transformative.',
      },
      {
        clientId: client2.id,
        therapistId: profile3.id,
        rating: 5,
        comment: 'Priya helped my partner and I communicate so much better. Her couples art therapy sessions are unique and effective.',
      },
    ],
  });

  console.log('✓ Reviews created');

  // ─── Sample Appointments ──────────────────────────────────────────────────
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(10, 0, 0, 0);

  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  nextWeek.setHours(14, 0, 0, 0);

  const nextWeek2 = new Date();
  nextWeek2.setDate(nextWeek2.getDate() + 10);
  nextWeek2.setHours(11, 0, 0, 0);

  await prisma.appointment.createMany({
    skipDuplicates: true,
    data: [
      {
        clientId: client1.id,
        therapistId: profile1.id,
        startTime: yesterday,
        endTime: new Date(yesterday.getTime() + 60 * 60 * 1000),
        status: AppointmentStatus.COMPLETED,
        medium: SessionMedium.VIDEO,
        clientNotes: 'Following up on anxiety management techniques.',
      },
      {
        clientId: client1.id,
        therapistId: profile1.id,
        startTime: nextWeek,
        endTime: new Date(nextWeek.getTime() + 60 * 60 * 1000),
        status: AppointmentStatus.CONFIRMED,
        medium: SessionMedium.VIDEO,
      },
      {
        clientId: client2.id,
        therapistId: profile2.id,
        startTime: nextWeek2,
        endTime: new Date(nextWeek2.getTime() + 50 * 60 * 1000),
        status: AppointmentStatus.PENDING,
        medium: SessionMedium.IN_PERSON,
        clientNotes: 'First session - grief counseling.',
      },
    ],
  });

  console.log('✓ Appointments created');

  // ─── Therapy Plans & Participants ─────────────────────────────────────────

  const planPersonal = await prisma.therapyPlan.create({
    data: {
      therapistId: profile1.id,
      type: TherapyPlanType.PERSONAL_CONSULT,
      status: TherapyPlanStatus.PUBLISHED,
      title: 'Individual Anxiety Management',
      introduction: 'A 1-on-1 personalized art therapy session focused on managing anxiety through guided drawing and reflection.',
      startTime: nextWeek,
      location: '123 Healing Arts Blvd, Suite 200',
      contactInfo: 'sarah.chen@arttherapy.dev',
      sessionMedium: SessionMedium.VIDEO,
      publishedAt: new Date(),
    }
  });

  const planGroup = await prisma.therapyPlan.create({
    data: {
      therapistId: profile2.id,
      type: TherapyPlanType.GROUP_CONSULT,
      status: TherapyPlanStatus.PUBLISHED,
      title: 'Grief & Loss Group Therapy',
      introduction: 'Join a small, supportive group of individuals navigating loss. We will use collage and sculpture to process grief together.',
      startTime: nextWeek2,
      location: 'Online via Zoom',
      maxParticipants: 8,
      contactInfo: 'marcus.webb@arttherapy.dev',
      publishedAt: new Date(),
    }
  });

  const planSalon = await prisma.therapyPlan.create({
    data: {
      therapistId: profile3.id,
      type: TherapyPlanType.ART_SALON,
      status: TherapyPlanStatus.PUBLISHED,
      title: 'Mindful Painting Salon',
      introduction: 'A single-day open painting session focused on mindfulness and being present in the moment. Open to all skill levels.',
      startTime: nextWeek,
      location: 'Community Art Center, Room B',
      maxParticipants: 15,
      contactInfo: 'priya.patel@arttherapy.dev',
      artSalonSubType: ArtSalonSubType.PAINTING,
      publishedAt: new Date(),
      participants: {
        create: [
          { userId: client1.id },
          { userId: client2.id },
        ]
      }
    }
  });

  const retreatStart = new Date(nextWeek.getTime() + 14 * 24 * 60 * 60 * 1000);
  const retreatEnd = new Date(retreatStart.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days later

  const planRetreat = await prisma.therapyPlan.create({
    data: {
      therapistId: profile1.id,
      type: TherapyPlanType.WELLNESS_RETREAT,
      status: TherapyPlanStatus.PUBLISHED,
      title: 'Weekend Reconnect Retreat',
      introduction: 'Escape the city for a 3-day immersive wellness retreat integrating daily art therapy, nature walks, and group reflection.',
      startTime: retreatStart,
      endTime: retreatEnd,
      location: 'Mountain View Lodge',
      maxParticipants: 12,
      contactInfo: 'retreats@arttherapy.dev',
      publishedAt: new Date(),
      participants: {
        create: [
          { userId: client1.id },
          { userId: client2.id },
        ]
      }
    }
  });

  console.log('✓ Therapy plans and participants created');

  console.log('\n✅ Seed complete!\n');
  console.log('Test accounts (all use password: password123)');
  console.log('─────────────────────────────────────────────');
  console.log('Admin:      admin@arttherapy.dev');
  console.log('Client:     client@arttherapy.dev');
  console.log('Client 2:   client2@arttherapy.dev');
  console.log('Therapist:  therapist@arttherapy.dev');
  console.log('Therapist 2: therapist2@arttherapy.dev');
  console.log('Therapist 3: therapist3@arttherapy.dev');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
