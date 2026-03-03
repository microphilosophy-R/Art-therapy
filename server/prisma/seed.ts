/// <reference types="node" />
import 'dotenv/config';
import {
  PrismaClient,
  Role,
  SessionMedium,
  AppointmentStatus,
  TherapyPlanType,
  ArtSalonSubType,
  TherapyPlanStatus,
  ProductCategory,
  CertificateType,
  CertificateStatus,
  ProfileStatus,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const daysFromNow = (days: number, hour = 10, minute = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d;
};

async function main() {
  console.log('🌱 Seeding database...');

  const passwordHash = await bcrypt.hash('password123', 10);

  // Users
  const admin = await prisma.user.create({
    data: {
      email: 'admin@arttherapy.dev',
      passwordHash,
      role: Role.ADMIN,
      firstName: 'Admin',
      lastName: 'User',
    },
  });

  const client1 = await prisma.user.create({
    data: {
      email: 'client@arttherapy.dev',
      passwordHash,
      role: Role.MEMBER,
      firstName: 'Alex',
      lastName: 'Rivera',
      phone: '+1 555-0101',
    },
  });

  const therapist1User = await prisma.user.create({
    data: {
      email: 'therapist@arttherapy.dev',
      passwordHash,
      role: Role.MEMBER,
      firstName: 'Sarah',
      lastName: 'Chen',
      phone: '+1 555-0202',
    },
  });

  const therapist2User = await prisma.user.create({
    data: {
      email: 'therapist2@arttherapy.dev',
      passwordHash,
      role: Role.MEMBER,
      firstName: 'Marcus',
      lastName: 'Webb',
    },
  });

  const artist1User = await prisma.user.create({
    data: {
      email: 'artist@arttherapy.dev',
      passwordHash,
      role: Role.MEMBER,
      firstName: 'Li',
      lastName: 'Wei',
    },
  });

  console.log('✓ Users created');

  // Unified Profiles
  const profile1 = await prisma.userProfile.create({
    data: {
      userId: therapist1User.id,
      bio: 'Licensed art therapist with over 10 years of experience helping clients process trauma and anxiety through creative expression.',
      specialties: ['Trauma', 'Anxiety', 'PTSD'],
      sessionPrice: 120.00,
      sessionLength: 60,
      locationCity: 'San Francisco, CA',
      isAccepting: true,
      rating: 4.9,
      profileStatus: ProfileStatus.APPROVED,
      consultEnabled: true,
      hourlyConsultFee: 200,
      featuredImageUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400',
      certificates: {
        create: [
          { type: CertificateType.THERAPIST, status: CertificateStatus.APPROVED, tosAcceptedAt: new Date() },
        ],
      },
    },
  });

  const profile2 = await prisma.userProfile.create({
    data: {
      userId: therapist2User.id,
      bio: 'Specializing in grief counseling and life transitions using art therapy.',
      specialties: ['Grief', 'Depression', 'Children'],
      sessionPrice: 95.00,
      sessionLength: 50,
      locationCity: 'Austin, TX',
      isAccepting: true,
      rating: 4.7,
      profileStatus: ProfileStatus.APPROVED,
      certificates: {
        create: [
          { type: CertificateType.THERAPIST, status: CertificateStatus.APPROVED, tosAcceptedAt: new Date() },
        ],
      },
    },
  });

  const artistProfile = await prisma.userProfile.create({
    data: {
      userId: artist1User.id,
      bio: 'Traditional Chinese ink and watercolor artist exploring mindfulness through art.',
      locationCity: 'Seattle, WA',
      profileStatus: ProfileStatus.APPROVED,
      certificates: {
        create: [
          { type: CertificateType.ARTIFICER, status: CertificateStatus.APPROVED, tosAcceptedAt: new Date() },
        ],
      },
    },
  });

  console.log('✓ Profiles created');

  // Gallery Images
  await prisma.galleryImage.createMany({
    data: [
      { userProfileId: profile1.id, url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=400', order: 0 },
      { userProfileId: profile1.id, url: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400', order: 1 },
      { userProfileId: profile2.id, url: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=400', order: 0 },
    ],
  });

  console.log('✓ Gallery images created');

  // Availability
  for (const day of [1, 2, 3, 4, 5]) {
    await prisma.availability.create({
      data: { userProfileId: profile1.id, dayOfWeek: day, startTime: '09:00', endTime: '17:00' },
    });
  }

  console.log('✓ Availability created');

  // Refund Policies
  await prisma.refundPolicy.create({
    data: {
      userProfileId: profile1.id,
      fullRefundHoursThreshold: 24,
      allowPartialRefund: true,
      partialRefundPercent: 50,
      policyDescription: 'Full refund if cancelled 24+ hours before session. 50% refund within 24 hours.',
    },
  });

  console.log('✓ Refund policies created');

  // Reviews
  await prisma.review.createMany({
    data: [
      {
        clientId: client1.id,
        userProfileId: profile1.id,
        rating: 5,
        comment: 'Sarah has been incredibly helpful. Art therapy allowed me to express things I could not put into words.',
      },
      {
        clientId: client1.id,
        userProfileId: profile2.id,
        rating: 4,
        comment: 'Marcus is compassionate and patient. The grief work through collage was transformative.',
      },
    ],
  });

  console.log('✓ Reviews created');

  // Appointments
  await prisma.appointment.create({
    data: {
      clientId: client1.id,
      userProfileId: profile1.id,
      startTime: daysFromNow(7, 14, 0),
      endTime: daysFromNow(7, 15, 0),
      status: AppointmentStatus.CONFIRMED,
      medium: SessionMedium.VIDEO,
    },
  });

  console.log('✓ Appointments created');

  // Therapy Plans
  await prisma.therapyPlan.create({
    data: {
      userProfileId: profile1.id,
      type: TherapyPlanType.PERSONAL_CONSULT,
      status: TherapyPlanStatus.PUBLISHED,
      title: 'Individual Anxiety Management',
      slogan: 'Find calm through creative expression',
      introduction: 'A personalized 1-on-1 art therapy session focused on managing anxiety.',
      startTime: daysFromNow(7, 10, 0),
      location: '123 Healing Arts Blvd, San Francisco',
      contactInfo: 'sarah.chen@arttherapy.dev',
      sessionMedium: SessionMedium.VIDEO,
      defaultPosterId: 1,
      publishedAt: daysFromNow(-10),
    },
  });

  await prisma.therapyPlan.create({
    data: {
      userProfileId: profile2.id,
      type: TherapyPlanType.ART_SALON,
      status: TherapyPlanStatus.PUBLISHED,
      title: 'Mindful Painting Salon',
      slogan: 'Be present. Paint freely.',
      introduction: 'An open painting session focused on mindfulness. All skill levels welcome.',
      startTime: daysFromNow(7, 13, 0),
      endTime: daysFromNow(7, 16, 0),
      location: 'Community Art Center, Austin',
      maxParticipants: 15,
      contactInfo: 'marcus.webb@arttherapy.dev',
      artSalonSubType: ArtSalonSubType.PAINTING,
      price: 120,
      defaultPosterId: 1,
      publishedAt: daysFromNow(-7),
    },
  });

  console.log('✓ Therapy plans created');

  // Products
  await prisma.product.create({
    data: {
      userProfileId: artistProfile.id,
      title: 'Autumn Mountain Watercolor',
      description: 'Original hand-painted watercolor on 300gsm cold-press paper. Each piece is unique and signed.',
      price: 980.00,
      stock: 3,
      category: ProductCategory.PAINTING,
      images: {
        create: [
          { url: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800', order: 0 },
        ],
      },
    },
  });

  await prisma.product.create({
    data: {
      userProfileId: artistProfile.id,
      title: 'Handmade Ceramic Therapy Mug',
      description: 'Hand-thrown ceramic mug in calming sage glaze. Approx. 350ml capacity.',
      price: 198.00,
      stock: 8,
      category: ProductCategory.MERCHANDISE,
      images: {
        create: [
          { url: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800', order: 0 },
        ],
      },
    },
  });

  console.log('✓ Products created');

  console.log('\n✅ Seed complete!\n');
  console.log('Test accounts — password for all: password123');
  console.log('─────────────────────────────────────────────────────');
  console.log('Admin:       admin@arttherapy.dev');
  console.log('Therapist 1: therapist@arttherapy.dev   (Sarah Chen)');
  console.log('Therapist 2: therapist2@arttherapy.dev  (Marcus Webb)');
  console.log('Artist:      artist@arttherapy.dev      (Li Wei)');
  console.log('Client:      client@arttherapy.dev      (Alex Rivera)');
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
