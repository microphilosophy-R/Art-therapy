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

const daysAgo = (days: number, hour = 10, minute = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
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

  const client2 = await prisma.user.create({
    data: {
      email: 'client2@arttherapy.dev',
      passwordHash,
      role: Role.MEMBER,
      firstName: 'Jordan',
      lastName: 'Kim',
    },
  });

  const client3 = await prisma.user.create({
    data: {
      email: 'client3@arttherapy.dev',
      passwordHash,
      role: Role.MEMBER,
      firstName: 'Taylor',
      lastName: 'Martinez',
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
      { userProfileId: profile1.id, url: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=400', order: 2 },
      { userProfileId: profile1.id, url: 'https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?w=400', order: 3 },
      { userProfileId: profile2.id, url: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=400', order: 0 },
      { userProfileId: profile2.id, url: 'https://images.unsplash.com/photo-1578301978162-7aae4d755744?w=400', order: 1 },
      { userProfileId: profile2.id, url: 'https://images.unsplash.com/photo-1515405295579-ba7b45403062?w=400', order: 2 },
      { userProfileId: artistProfile.id, url: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400', order: 0 },
      { userProfileId: artistProfile.id, url: 'https://images.unsplash.com/photo-1547891654-e66ed7ebb968?w=400', order: 1 },
      { userProfileId: artistProfile.id, url: 'https://images.unsplash.com/photo-1582201957340-1823b00f9c88?w=400', order: 2 },
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

  // Additional therapy plans with various statuses
  await prisma.therapyPlan.create({
    data: {
      userProfileId: profile1.id,
      type: TherapyPlanType.PERSONAL_CONSULT,
      status: TherapyPlanStatus.DRAFT,
      title: 'Stress Relief Through Art',
      slogan: 'Find peace in creativity',
      introduction: 'Draft plan for stress management',
      startTime: daysFromNow(14, 10, 0),
      location: 'TBD',
      contactInfo: 'sarah.chen@arttherapy.dev',
      sessionMedium: SessionMedium.VIDEO,
      defaultPosterId: 2,
    },
  });

  await prisma.therapyPlan.create({
    data: {
      userProfileId: profile2.id,
      type: TherapyPlanType.ART_SALON,
      status: TherapyPlanStatus.PENDING_REVIEW,
      title: 'Community Art Workshop',
      slogan: 'Create together',
      introduction: 'Awaiting admin approval',
      startTime: daysFromNow(10, 13, 0),
      location: 'Community Center, Austin',
      contactInfo: 'marcus.webb@arttherapy.dev',
      submittedAt: daysAgo(2),
      defaultPosterId: 3,
    },
  });

  const inProgressPlan = await prisma.therapyPlan.create({
    data: {
      userProfileId: profile1.id,
      type: TherapyPlanType.PERSONAL_CONSULT,
      status: TherapyPlanStatus.IN_PROGRESS,
      title: 'Ongoing Anxiety Support',
      slogan: 'Weekly art therapy sessions',
      introduction: 'Currently running program',
      startTime: daysAgo(10, 14, 0),
      location: 'Online',
      contactInfo: 'sarah.chen@arttherapy.dev',
      sessionMedium: SessionMedium.VIDEO,
      publishedAt: daysAgo(20),
      defaultPosterId: 4,
    },
  });

  await prisma.therapyPlan.create({
    data: {
      userProfileId: profile2.id,
      type: TherapyPlanType.ART_SALON,
      status: TherapyPlanStatus.IN_PROGRESS,
      title: 'Group Healing Circle',
      slogan: 'Heal together through art',
      introduction: 'Active group therapy sessions',
      startTime: daysAgo(5, 10, 0),
      location: 'Wellness Studio, Austin',
      contactInfo: 'marcus.webb@arttherapy.dev',
      publishedAt: daysAgo(15),
      defaultPosterId: 5,
    },
  });

  const finishedPlan = await prisma.therapyPlan.create({
    data: {
      userProfileId: profile1.id,
      type: TherapyPlanType.ART_SALON,
      status: TherapyPlanStatus.FINISHED,
      title: 'Completed Mindfulness Series',
      slogan: 'Journey completed',
      introduction: 'Successfully completed 8-week program',
      startTime: daysAgo(60, 10, 0),
      endTime: daysAgo(4, 16, 0),
      location: 'Art Studio SF',
      contactInfo: 'sarah.chen@arttherapy.dev',
      publishedAt: daysAgo(70),
      defaultPosterId: 1,
    },
  });

  await prisma.therapyPlan.create({
    data: {
      userProfileId: profile2.id,
      type: TherapyPlanType.PERSONAL_CONSULT,
      status: TherapyPlanStatus.FINISHED,
      title: 'Grief Processing Program',
      slogan: 'Finding light after loss',
      introduction: 'Completed grief counseling series',
      startTime: daysAgo(90, 14, 0),
      endTime: daysAgo(30, 15, 0),
      location: 'Online',
      contactInfo: 'marcus.webb@arttherapy.dev',
      sessionMedium: SessionMedium.VIDEO,
      publishedAt: daysAgo(100),
      defaultPosterId: 2,
    },
  });

  await prisma.therapyPlan.create({
    data: {
      userProfileId: profile1.id,
      type: TherapyPlanType.PERSONAL_CONSULT,
      status: TherapyPlanStatus.ARCHIVED,
      title: 'Old Therapy Program',
      slogan: 'Archived for reference',
      introduction: 'Historical program no longer active',
      startTime: daysAgo(180, 10, 0),
      location: 'Former Location',
      contactInfo: 'sarah.chen@arttherapy.dev',
      publishedAt: daysAgo(200),
      defaultPosterId: 3,
    },
  });

  await prisma.therapyPlan.create({
    data: {
      userProfileId: profile2.id,
      type: TherapyPlanType.ART_SALON,
      status: TherapyPlanStatus.REJECTED,
      title: 'Rejected Workshop Proposal',
      slogan: 'Not approved',
      introduction: 'Did not meet guidelines',
      startTime: daysFromNow(5, 10, 0),
      location: 'Proposed Location',
      contactInfo: 'marcus.webb@arttherapy.dev',
      submittedAt: daysAgo(5),
      reviewedAt: daysAgo(3),
      defaultPosterId: 4,
    },
  });

  console.log('✓ Additional therapy plans created');

  // Therapy plan participants
  await prisma.therapyPlanParticipant.create({
    data: {
      userId: client1.id,
      planId: inProgressPlan.id,
      status: 'SIGNED_UP',
    },
  });

  await prisma.therapyPlanParticipant.create({
    data: {
      userId: client2.id,
      planId: inProgressPlan.id,
      status: 'SIGNED_UP',
    },
  });

  await prisma.therapyPlanParticipant.create({
    data: {
      userId: client1.id,
      planId: finishedPlan.id,
      status: 'CANCELLED',
    },
  });

  await prisma.therapyPlanParticipant.create({
    data: {
      userId: therapist2User.id,
      planId: inProgressPlan.id,
      status: 'SIGNED_UP',
    },
  });

  console.log('✓ Therapy plan participants created');

  // Update profile views
  await prisma.userProfile.update({
    where: { id: profile1.id },
    data: { profileViews: 245 }
  });

  await prisma.userProfile.update({
    where: { id: profile2.id },
    data: { profileViews: 178 }
  });

  await prisma.userProfile.update({
    where: { id: artistProfile.id },
    data: { profileViews: 532 }
  });

  console.log('✓ Profile views updated');

  // Products
  const product1 = await prisma.product.create({
    data: {
      userProfileId: artistProfile.id,
      title: 'Autumn Mountain Watercolor',
      description: 'Original hand-painted watercolor on 300gsm cold-press paper. Each piece is unique and signed.',
      price: 980.00,
      stock: 3,
      category: ProductCategory.PAINTING,
      status: 'PUBLISHED',
      images: {
        create: [
          { url: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800', order: 0 },
        ],
      },
    },
  });

  const product2 = await prisma.product.create({
    data: {
      userProfileId: artistProfile.id,
      title: 'Handmade Ceramic Therapy Mug',
      description: 'Hand-thrown ceramic mug in calming sage glaze. Approx. 350ml capacity.',
      price: 198.00,
      stock: 0,
      category: ProductCategory.MERCHANDISE,
      status: 'PUBLISHED',
      images: {
        create: [
          { url: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800', order: 0 },
        ],
      },
    },
  });

  await prisma.product.create({
    data: {
      userProfileId: artistProfile.id,
      title: 'Abstract Ink Series',
      description: 'Work in progress - abstract ink paintings',
      price: 750.00,
      stock: 2,
      category: ProductCategory.PAINTING,
      status: 'DRAFT',
    },
  });

  await prisma.product.create({
    data: {
      userProfileId: profile1.id,
      title: 'Therapy Journal Set',
      description: 'Guided art therapy journal with prompts',
      price: 128.00,
      stock: 15,
      category: ProductCategory.MERCHANDISE,
      status: 'DRAFT',
    },
  });

  await prisma.product.create({
    data: {
      userProfileId: artistProfile.id,
      title: 'Mindfulness Coloring Book',
      description: 'Hand-drawn therapeutic coloring book',
      price: 88.00,
      stock: 20,
      category: ProductCategory.MERCHANDISE,
      status: 'PENDING_REVIEW',
      images: {
        create: [{ url: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800', order: 0 }]
      }
    },
  });

  await prisma.product.create({
    data: {
      userProfileId: profile2.id,
      title: 'Art Therapy Toolkit',
      description: 'Complete starter kit for art therapy practice',
      price: 450.00,
      stock: 8,
      category: ProductCategory.MERCHANDISE,
      status: 'PENDING_REVIEW',
      images: {
        create: [{ url: 'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?w=800', order: 0 }]
      }
    },
  });

  console.log('✓ Products created');

  // Orders - distributed over time
  await prisma.order.create({
    data: {
      userId: client1.id,
      status: 'PAID',
      totalAmount: 980,
      province: 'California',
      city: 'San Francisco',
      district: 'Downtown',
      addressDetail: '123 Main St',
      recipientName: 'Alex Rivera',
      phone: '+1 555-0101',
      createdAt: daysAgo(0, 9, 30),
      items: { create: [{ productId: product1.id, quantity: 1, price: 980 }] }
    }
  });

  await prisma.order.create({
    data: {
      userId: client2.id,
      status: 'PAID',
      totalAmount: 198,
      province: 'Washington',
      city: 'Seattle',
      district: 'Capitol Hill',
      addressDetail: '456 Oak Ave',
      recipientName: 'Jordan Kim',
      phone: '+1 555-0202',
      createdAt: daysAgo(0, 14, 15),
      items: { create: [{ productId: product2.id, quantity: 1, price: 198 }] }
    }
  });

  await prisma.order.create({
    data: {
      userId: client3.id,
      status: 'DELIVERED',
      totalAmount: 1960,
      province: 'Texas',
      city: 'Austin',
      district: 'East Side',
      addressDetail: '789 Elm St',
      recipientName: 'Taylor Martinez',
      phone: '+1 555-0303',
      createdAt: daysAgo(3),
      items: { create: [{ productId: product1.id, quantity: 2, price: 980 }] }
    }
  });

  await prisma.order.create({
    data: {
      userId: therapist1User.id,
      status: 'SHIPPED',
      totalAmount: 594,
      province: 'California',
      city: 'San Francisco',
      district: 'Mission',
      addressDetail: '321 Pine St',
      recipientName: 'Sarah Chen',
      phone: '+1 555-0202',
      createdAt: daysAgo(5),
      items: { create: [{ productId: product2.id, quantity: 3, price: 198 }] }
    }
  });

  await prisma.order.create({
    data: {
      userId: client1.id,
      status: 'PAID',
      totalAmount: 980,
      province: 'California',
      city: 'San Francisco',
      district: 'Downtown',
      addressDetail: '123 Main St',
      recipientName: 'Alex Rivera',
      phone: '+1 555-0101',
      createdAt: daysAgo(6),
      items: { create: [{ productId: product1.id, quantity: 1, price: 980 }] }
    }
  });

  await prisma.order.create({
    data: {
      userId: client2.id,
      status: 'DELIVERED',
      totalAmount: 396,
      province: 'Washington',
      city: 'Seattle',
      district: 'Capitol Hill',
      addressDetail: '456 Oak Ave',
      recipientName: 'Jordan Kim',
      phone: '+1 555-0202',
      createdAt: daysAgo(6),
      items: { create: [{ productId: product2.id, quantity: 2, price: 198 }] }
    }
  });

  await prisma.order.create({
    data: {
      userId: therapist2User.id,
      status: 'PAID',
      totalAmount: 980,
      province: 'Texas',
      city: 'Austin',
      district: 'West Campus',
      addressDetail: '654 Maple Dr',
      recipientName: 'Marcus Webb',
      phone: '+1 555-0404',
      createdAt: daysAgo(12),
      items: { create: [{ productId: product1.id, quantity: 1, price: 980 }] }
    }
  });

  await prisma.order.create({
    data: {
      userId: client3.id,
      status: 'SHIPPED',
      totalAmount: 198,
      province: 'Texas',
      city: 'Austin',
      district: 'East Side',
      addressDetail: '789 Elm St',
      recipientName: 'Taylor Martinez',
      phone: '+1 555-0303',
      createdAt: daysAgo(15),
      items: { create: [{ productId: product2.id, quantity: 1, price: 198 }] }
    }
  });

  await prisma.order.create({
    data: {
      userId: client1.id,
      status: 'DELIVERED',
      totalAmount: 1960,
      province: 'California',
      city: 'San Francisco',
      district: 'Downtown',
      addressDetail: '123 Main St',
      recipientName: 'Alex Rivera',
      phone: '+1 555-0101',
      createdAt: daysAgo(20),
      items: { create: [{ productId: product1.id, quantity: 2, price: 980 }] }
    }
  });

  await prisma.order.create({
    data: {
      userId: client2.id,
      status: 'PAID',
      totalAmount: 198,
      province: 'Washington',
      city: 'Seattle',
      district: 'Capitol Hill',
      addressDetail: '456 Oak Ave',
      recipientName: 'Jordan Kim',
      phone: '+1 555-0202',
      createdAt: daysAgo(25),
      items: { create: [{ productId: product2.id, quantity: 1, price: 198 }] }
    }
  });

  await prisma.order.create({
    data: {
      userId: therapist1User.id,
      status: 'DELIVERED',
      totalAmount: 980,
      province: 'California',
      city: 'San Francisco',
      district: 'Mission',
      addressDetail: '321 Pine St',
      recipientName: 'Sarah Chen',
      phone: '+1 555-0202',
      createdAt: daysAgo(45),
      items: { create: [{ productId: product1.id, quantity: 1, price: 980 }] }
    }
  });

  await prisma.order.create({
    data: {
      userId: client3.id,
      status: 'PAID',
      totalAmount: 396,
      province: 'Texas',
      city: 'Austin',
      district: 'East Side',
      addressDetail: '789 Elm St',
      recipientName: 'Taylor Martinez',
      phone: '+1 555-0303',
      createdAt: daysAgo(60),
      items: { create: [{ productId: product2.id, quantity: 2, price: 198 }] }
    }
  });

  console.log('✓ Orders created');

  console.log('\n✅ Seed complete!\n');
  console.log('Test accounts — password for all: password123');
  console.log('─────────────────────────────────────────────────────');
  console.log('Admin:       admin@arttherapy.dev');
  console.log('Therapist 1: therapist@arttherapy.dev   (Sarah Chen)');
  console.log('Therapist 2: therapist2@arttherapy.dev  (Marcus Webb)');
  console.log('Artist:      artist@arttherapy.dev      (Li Wei)');
  console.log('Client 1:    client@arttherapy.dev      (Alex Rivera)');
  console.log('Client 2:    client2@arttherapy.dev     (Jordan Kim)');
  console.log('Client 3:    client3@arttherapy.dev     (Taylor Martinez)');
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
