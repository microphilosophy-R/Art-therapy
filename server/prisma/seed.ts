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
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ─── Date helpers ─────────────────────────────────────────────────────────────
const daysFromNow = (days: number, hour = 10, minute = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d;
};

async function main() {
  console.log('🌱 Seeding database — wiping existing data first...');

  // ─── Clean slate (FK-safe deletion order) ─────────────────────────────────
  await prisma.planPayment.deleteMany();
  await prisma.therapyPlanParticipant.deleteMany();
  await prisma.therapyPlanEvent.deleteMany();
  await prisma.therapyPlanImage.deleteMany();
  await prisma.therapyPlanPdf.deleteMany();
  await prisma.message.deleteMany();
  await prisma.therapyPlan.deleteMany();
  await prisma.therapyPlanTemplate.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.sessionNote.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.review.deleteMany();
  await prisma.formAnswer.deleteMany();
  await prisma.formResponse.deleteMany();
  await prisma.formQuestion.deleteMany();
  await prisma.clientForm.deleteMany();
  await prisma.webhookEvent.deleteMany();
  await prisma.refundPolicy.deleteMany();
  await prisma.availability.deleteMany();
  await prisma.galleryImage.deleteMany();
  await prisma.therapistProfile.deleteMany();

  // New unified profile tables
  await prisma.userCertificate.deleteMany();
  await prisma.userProfile.deleteMany();

  // Shop tables
  await prisma.productPayment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.product.deleteMany();
  await prisma.artistProfile.deleteMany();
  await prisma.user.deleteMany();

  console.log('✓ All tables cleared');

  // ─── Users ────────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('password123', 10);

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
      role: Role.CLIENT,
      firstName: 'Alex',
      lastName: 'Rivera',
      phone: '+1 555-0101',
    },
  });

  const client2 = await prisma.user.create({
    data: {
      email: 'client2@arttherapy.dev',
      passwordHash,
      role: Role.CLIENT,
      firstName: 'Jordan',
      lastName: 'Kim',
    },
  });

  const therapist1User = await prisma.user.create({
    data: {
      email: 'therapist@arttherapy.dev',
      passwordHash,
      role: Role.THERAPIST,
      firstName: 'Sarah',
      lastName: 'Chen',
      phone: '+1 555-0202',
    },
  });

  const therapist2User = await prisma.user.create({
    data: {
      email: 'therapist2@arttherapy.dev',
      passwordHash,
      role: Role.THERAPIST,
      firstName: 'Marcus',
      lastName: 'Webb',
    },
  });

  const therapist3User = await prisma.user.create({
    data: {
      email: 'therapist3@arttherapy.dev',
      passwordHash,
      role: Role.THERAPIST,
      firstName: 'Priya',
      lastName: 'Patel',
    },
  });

  console.log('✓ Users created');

  // ─── Therapist Profiles ───────────────────────────────────────────────────
  const profile1 = await prisma.therapistProfile.create({
    data: {
      userId: therapist1User.id,
      bio: 'Licensed art therapist with over 10 years of experience helping clients process trauma and anxiety through creative expression. My approach integrates traditional talk therapy with painting, drawing, and mixed media.',
      specialties: ['Trauma', 'Anxiety', 'PTSD'],
      sessionPrice: 120.00,
      sessionLength: 60,
      locationCity: 'San Francisco, CA',
      isAccepting: true,
      rating: 4.9,
      profileStatus: 'APPROVED',
      consultEnabled: true,
      hourlyConsultFee: 200,
      socialMediaLink: 'https://instagram.com',
    },
  });

  const profile2 = await prisma.therapistProfile.create({
    data: {
      userId: therapist2User.id,
      bio: 'Specialising in grief counselling and life transitions. I use art therapy to help adults and children navigate loss through sculpture, collage, and painting.',
      specialties: ['Grief', 'Depression', 'Children'],
      sessionPrice: 95.00,
      sessionLength: 50,
      locationCity: 'Austin, TX',
      isAccepting: true,
      rating: 4.7,
      profileStatus: 'APPROVED',
    },
  });

  const profile3 = await prisma.therapistProfile.create({
    data: {
      userId: therapist3User.id,
      bio: 'I work with couples and individuals experiencing relationship challenges using art-based interventions to improve communication and deepen emotional connection.',
      specialties: ['Couples', 'Stress', 'Anxiety'],
      sessionPrice: 150.00,
      sessionLength: 90,
      locationCity: 'New York, NY',
      isAccepting: true,
      rating: 4.8,
      profileStatus: 'APPROVED',
    },
  });

  console.log('✓ Therapist profiles created');

  // ─── Gallery Images ───────────────────────────────────────────────────────
  await prisma.galleryImage.createMany({
    data: [
      { therapistId: profile2.id, url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=400', order: 0 },
      { therapistId: profile2.id, url: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400', order: 1 },
      { therapistId: profile2.id, url: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=400', order: 2 },
    ],
  });

  console.log('✓ Gallery images created');

  // ─── Availability ─────────────────────────────────────────────────────────
  for (const day of [1, 2, 3, 4, 5]) {
    await prisma.availability.create({
      data: { therapistId: profile1.id, dayOfWeek: day, startTime: '09:00', endTime: '17:00' },
    });
  }
  for (const day of [1, 3, 5]) {
    await prisma.availability.create({
      data: { therapistId: profile2.id, dayOfWeek: day, startTime: '10:00', endTime: '18:00' },
    });
  }
  for (const day of [2, 4, 6]) {
    await prisma.availability.create({
      data: { therapistId: profile3.id, dayOfWeek: day, startTime: '08:00', endTime: '16:00' },
    });
  }

  console.log('✓ Availability created');

  // ─── Refund Policies ──────────────────────────────────────────────────────
  await prisma.refundPolicy.create({
    data: {
      therapistId: profile1.id,
      fullRefundHoursThreshold: 24,
      allowPartialRefund: true,
      partialRefundPercent: 50,
      policyDescription: 'Full refund if cancelled 24+ hours before session. 50% refund within 24 hours.',
    },
  });

  await prisma.refundPolicy.create({
    data: {
      therapistId: profile2.id,
      fullRefundHoursThreshold: 48,
      allowPartialRefund: false,
      policyDescription: 'Full refund if cancelled 48+ hours before session. No refund within 48 hours.',
    },
  });

  await prisma.refundPolicy.create({
    data: {
      therapistId: profile3.id,
      fullRefundHoursThreshold: 24,
      allowPartialRefund: false,
      policyDescription: 'Full refund if cancelled at least 24 hours before the session.',
    },
  });

  console.log('✓ Refund policies created');

  // ─── Reviews ──────────────────────────────────────────────────────────────
  await prisma.review.createMany({
    data: [
      {
        clientId: client1.id,
        therapistId: profile1.id,
        rating: 5,
        comment: 'Sarah has been incredibly helpful. Art therapy allowed me to express things I could not put into words.',
      },
      {
        clientId: client2.id,
        therapistId: profile1.id,
        rating: 5,
        comment: 'Outstanding therapist. I have seen remarkable progress managing my anxiety.',
      },
      {
        clientId: client1.id,
        therapistId: profile2.id,
        rating: 4,
        comment: 'Marcus is compassionate and patient. The grief work through collage was transformative.',
      },
      {
        clientId: client2.id,
        therapistId: profile3.id,
        rating: 5,
        comment: 'Priya helped my partner and I communicate so much better. Unique and effective.',
      },
    ],
  });

  console.log('✓ Reviews created');

  // ─── Appointments ─────────────────────────────────────────────────────────
  // Past completed appointments
  await prisma.appointment.create({
    data: {
      clientId: client1.id,
      therapistId: profile1.id,
      startTime: daysFromNow(-14, 10, 0),
      endTime: daysFromNow(-14, 11, 0),
      status: AppointmentStatus.COMPLETED,
      medium: SessionMedium.VIDEO,
      clientNotes: 'Initial intake session.',
    },
  });

  await prisma.appointment.create({
    data: {
      clientId: client1.id,
      therapistId: profile1.id,
      startTime: daysFromNow(-7, 14, 0),
      endTime: daysFromNow(-7, 15, 0),
      status: AppointmentStatus.COMPLETED,
      medium: SessionMedium.VIDEO,
      clientNotes: 'Follow-up on anxiety management techniques.',
    },
  });

  await prisma.appointment.create({
    data: {
      clientId: client2.id,
      therapistId: profile2.id,
      startTime: daysFromNow(-3, 10, 0),
      endTime: daysFromNow(-3, 10, 50),
      status: AppointmentStatus.COMPLETED,
      medium: SessionMedium.IN_PERSON,
      clientNotes: 'First session — grief counselling.',
    },
  });

  // Upcoming confirmed appointments
  await prisma.appointment.create({
    data: {
      clientId: client1.id,
      therapistId: profile1.id,
      startTime: daysFromNow(7, 14, 0),
      endTime: daysFromNow(7, 15, 0),
      status: AppointmentStatus.CONFIRMED,
      medium: SessionMedium.VIDEO,
    },
  });

  await prisma.appointment.create({
    data: {
      clientId: client2.id,
      therapistId: profile3.id,
      startTime: daysFromNow(10, 11, 0),
      endTime: daysFromNow(10, 12, 30),
      status: AppointmentStatus.CONFIRMED,
      medium: SessionMedium.IN_PERSON,
    },
  });

  // Pending appointments (awaiting therapist confirmation)
  await prisma.appointment.create({
    data: {
      clientId: client2.id,
      therapistId: profile1.id,
      startTime: daysFromNow(14, 9, 0),
      endTime: daysFromNow(14, 10, 0),
      status: AppointmentStatus.PENDING,
      medium: SessionMedium.VIDEO,
      clientNotes: 'Would like to discuss stress management strategies.',
    },
  });

  await prisma.appointment.create({
    data: {
      clientId: client1.id,
      therapistId: profile2.id,
      startTime: daysFromNow(5, 10, 0),
      endTime: daysFromNow(5, 10, 50),
      status: AppointmentStatus.PENDING,
      medium: SessionMedium.IN_PERSON,
    },
  });

  console.log('✓ Appointments created');

  // ─── Therapy Plans ────────────────────────────────────────────────────────
  // Profile 1 — Sarah Chen
  // 1. PUBLISHED personal consult (upcoming)
  await prisma.therapyPlan.create({
    data: {
      therapistId: profile1.id,
      type: TherapyPlanType.PERSONAL_CONSULT,
      status: TherapyPlanStatus.PUBLISHED,
      title: 'Individual Anxiety Management',
      slogan: 'Find calm through creative expression',
      introduction: 'A personalised 1-on-1 art therapy session focused on managing anxiety through guided drawing and reflective journalling.',
      startTime: daysFromNow(7, 10, 0),
      location: '123 Healing Arts Blvd, Suite 200, San Francisco',
      contactInfo: 'sarah.chen@arttherapy.dev',
      sessionMedium: SessionMedium.VIDEO,
      defaultPosterId: 1,
      publishedAt: daysFromNow(-10),
    },
  });

  // 2. PUBLISHED wellness retreat (upcoming, with schedule events)
  const retreatStart = daysFromNow(21, 9, 0);
  const retreat = await prisma.therapyPlan.create({
    data: {
      therapistId: profile1.id,
      type: TherapyPlanType.WELLNESS_RETREAT,
      status: TherapyPlanStatus.PUBLISHED,
      title: 'Weekend Reconnect Retreat',
      slogan: 'Three days to reset mind, body and soul',
      introduction: 'An immersive 3-day wellness retreat integrating daily art therapy, nature walks, mindfulness, and group reflection sessions.',
      startTime: retreatStart,
      endTime: new Date(retreatStart.getTime() + 3 * 24 * 60 * 60 * 1000),
      location: 'Mountain View Lodge, Marin County',
      maxParticipants: 12,
      contactInfo: 'retreats@arttherapy.dev',
      price: 2800,
      defaultPosterId: 2,
      publishedAt: daysFromNow(-5),
      participants: {
        create: [
          { userId: client1.id },
          { userId: client2.id },
        ],
      },
      events: {
        create: [
          { startTime: new Date(retreatStart.getTime() + 0), endTime: new Date(retreatStart.getTime() + 2 * 60 * 60 * 1000), title: 'Arrival & Welcome Circle', isAvailable: true, order: 1 },
          { startTime: new Date(retreatStart.getTime() + 3 * 60 * 60 * 1000), endTime: new Date(retreatStart.getTime() + 5 * 60 * 60 * 1000), title: 'Expressive Painting Workshop', isAvailable: true, order: 2 },
          { startTime: new Date(retreatStart.getTime() + 24 * 60 * 60 * 1000), endTime: new Date(retreatStart.getTime() + 26 * 60 * 60 * 1000), title: 'Morning Mindfulness & Drawing', isAvailable: true, order: 3 },
          { startTime: new Date(retreatStart.getTime() + 48 * 60 * 60 * 1000), endTime: new Date(retreatStart.getTime() + 50 * 60 * 60 * 1000), title: 'Closing Ceremony & Reflection', isAvailable: true, order: 4 },
        ],
      },
    },
  });

  // 3. DRAFT art salon (not yet submitted)
  await prisma.therapyPlan.create({
    data: {
      therapistId: profile1.id,
      type: TherapyPlanType.ART_SALON,
      status: TherapyPlanStatus.DRAFT,
      title: 'Autumn Watercolour Evening',
      introduction: 'A relaxed drop-in watercolour evening exploring autumn themes. Suitable for beginners.',
      startTime: daysFromNow(35, 18, 0),
      endTime: daysFromNow(35, 20, 30),
      location: 'The Harbour Studio, SF',
      maxParticipants: 20,
      contactInfo: 'sarah.chen@arttherapy.dev',
      artSalonSubType: ArtSalonSubType.PAINTING,
      defaultPosterId: 3,
    },
  });

  // 4. REJECTED group consult (with rejection reason)
  await prisma.therapyPlan.create({
    data: {
      therapistId: profile1.id,
      type: TherapyPlanType.GROUP_CONSULT,
      status: TherapyPlanStatus.REJECTED,
      title: 'Teen Stress Relief Circle',
      introduction: 'Group art therapy session for teenagers dealing with academic pressure and social anxiety.',
      startTime: daysFromNow(14, 16, 0),
      location: 'Online via Zoom',
      maxParticipants: 6,
      contactInfo: 'sarah.chen@arttherapy.dev',
      rejectionReason: 'Please provide more detail about safeguarding protocols for minors and include parental consent procedures.',
      submittedAt: daysFromNow(-8),
      reviewedAt: daysFromNow(-6),
      defaultPosterId: 4,
    },
  });

  // Profile 2 — Marcus Webb
  // 5. PUBLISHED group consult (upcoming)
  await prisma.therapyPlan.create({
    data: {
      therapistId: profile2.id,
      type: TherapyPlanType.GROUP_CONSULT,
      status: TherapyPlanStatus.PUBLISHED,
      title: 'Grief & Loss Group Therapy',
      slogan: 'You do not have to grieve alone',
      introduction: 'Join a small supportive group navigating loss. We use collage and sculpture to process grief together in a safe, held space.',
      startTime: daysFromNow(10, 11, 0),
      location: 'Online via Zoom',
      maxParticipants: 8,
      contactInfo: 'marcus.webb@arttherapy.dev',
      price: 320,
      defaultPosterId: 2,
      publishedAt: daysFromNow(-12),
      participants: {
        create: [{ userId: client2.id }],
      },
    },
  });

  // 6. PENDING_REVIEW art salon
  await prisma.therapyPlan.create({
    data: {
      therapistId: profile2.id,
      type: TherapyPlanType.ART_SALON,
      status: TherapyPlanStatus.PENDING_REVIEW,
      title: 'Calligraphy & Mindfulness Morning',
      slogan: 'Slow down and write with intention',
      introduction: 'A two-hour calligraphy workshop combining traditional brush techniques with mindfulness breathing practices.',
      startTime: daysFromNow(18, 9, 0),
      endTime: daysFromNow(18, 11, 0),
      location: 'Webb Studio, 88 Oak Street, Austin',
      maxParticipants: 10,
      contactInfo: 'marcus.webb@arttherapy.dev',
      artSalonSubType: ArtSalonSubType.CALLIGRAPHY,
      price: 180,
      defaultPosterId: 5,
      submittedAt: daysFromNow(-1),
    },
  });

  // Profile 3 — Priya Patel
  // 7. PUBLISHED art salon (upcoming, participants enrolled)
  await prisma.therapyPlan.create({
    data: {
      therapistId: profile3.id,
      type: TherapyPlanType.ART_SALON,
      status: TherapyPlanStatus.PUBLISHED,
      title: 'Mindful Painting Salon',
      slogan: 'Be present. Paint freely.',
      introduction: 'An open painting session focused on mindfulness. All skill levels welcome — bring curiosity, leave your inner critic at the door.',
      startTime: daysFromNow(7, 13, 0),
      endTime: daysFromNow(7, 16, 0),
      location: 'Community Art Center, Room B, New York',
      maxParticipants: 15,
      contactInfo: 'priya.patel@arttherapy.dev',
      artSalonSubType: ArtSalonSubType.PAINTING,
      price: 120,
      defaultPosterId: 1,
      publishedAt: daysFromNow(-7),
      participants: {
        create: [
          { userId: client1.id },
          { userId: client2.id },
        ],
      },
    },
  });

  // 8. ARCHIVED wellness retreat (past)
  await prisma.therapyPlan.create({
    data: {
      therapistId: profile3.id,
      type: TherapyPlanType.WELLNESS_RETREAT,
      status: TherapyPlanStatus.ARCHIVED,
      title: 'Spring Renewal Retreat',
      introduction: 'A 2-day retreat exploring renewal and growth themes through collage, movement, and shared reflection.',
      startTime: daysFromNow(-30, 9, 0),
      endTime: daysFromNow(-28, 17, 0),
      location: 'Hudson Valley Retreat Centre',
      maxParticipants: 10,
      contactInfo: 'priya.patel@arttherapy.dev',
      price: 1800,
      defaultPosterId: 3,
      publishedAt: daysFromNow(-60),
    },
  });

  // 9. DRAFT personal consult (Priya drafting)
  await prisma.therapyPlan.create({
    data: {
      therapistId: profile3.id,
      type: TherapyPlanType.PERSONAL_CONSULT,
      status: TherapyPlanStatus.DRAFT,
      title: 'Couples Art Therapy — Pilot',
      introduction: 'A pilot 1-on-1 couples session combining art-based communication exercises with guided dialogue.',
      startTime: daysFromNow(28, 10, 0),
      location: 'Online via Zoom',
      contactInfo: 'priya.patel@arttherapy.dev',
      sessionMedium: SessionMedium.VIDEO,
      defaultPosterId: 4,
    },
  });

  console.log('✓ Therapy plans created');

  // ─── Artist Users ─────────────────────────────────────────────────────────
  const artist1User = await prisma.user.create({
    data: {
      email: 'artist@arttherapy.dev',
      passwordHash,
      role: Role.ARTIST,
      firstName: 'Li',
      lastName: 'Wei',
      phone: '+86 138-0013-8000',
    },
  });

  const artist2User = await prisma.user.create({
    data: {
      email: 'artist2@arttherapy.dev',
      passwordHash,
      role: Role.ARTIST,
      firstName: 'Mei',
      lastName: 'Zhang',
    },
  });

  console.log('✓ Artist users created');

  // ─── Artist Profiles ──────────────────────────────────────────────────────
  const artistProfile1 = await prisma.artistProfile.create({
    data: {
      userId: artist1User.id,
      bio: 'Traditional Chinese ink and watercolour artist. My work explores the connection between mindfulness, nature, and the healing power of slow, intentional brushwork.',
      portfolioUrl: 'https://unsplash.com',
      socialMediaLink: 'https://instagram.com',
      profileStatus: 'APPROVED',
      submittedAt: daysFromNow(-20),
      reviewedAt: daysFromNow(-18),
    },
  });

  const artistProfile2 = await prisma.artistProfile.create({
    data: {
      userId: artist2User.id,
      bio: 'Digital illustrator and ceramic artist working at the intersection of technology and handcraft. I create tools and objects designed to support emotional wellbeing.',
      portfolioUrl: 'https://unsplash.com',
      profileStatus: 'APPROVED',
      submittedAt: daysFromNow(-15),
      reviewedAt: daysFromNow(-13),
    },
  });

  console.log('✓ Artist profiles created');

  // ─── Products ─────────────────────────────────────────────────────────────
  // Artist 1 — Li Wei (painting / crafts)
  await prisma.product.create({
    data: {
      artistId: artistProfile1.id,
      title: '秋山水彩原画 / Autumn Mountain Watercolour',
      description: '手工水彩原画，描绘秋日山间晨雾。使用专业水彩纸与颜料，适合装裱收藏。\n\nOriginal hand-painted watercolour on 300gsm cold-press paper. Depicts misty mountain peaks at dawn. Each piece is unique and signed by the artist. Suitable for framing.',
      price: 980.00,
      stock: 3,
      category: ProductCategory.PAINTING,
      images: {
        create: [
          { url: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800', order: 0 },
          { url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=800', order: 1 },
        ],
      },
    },
  });

  await prisma.product.create({
    data: {
      artistId: artistProfile1.id,
      title: '书法挂轴「静」/ Calligraphy Scroll — Stillness',
      description: '手写书法挂轴，字为「静」，意为宁静与内心平和。宣纸墨书，配实木轴杆，可直接悬挂。\n\nHand-brushed Chinese calligraphy on Xuan paper mounted on a bamboo scroll. The character 静 (stillness) is rendered in a flowing semi-cursive style. Ready to hang.',
      price: 560.00,
      stock: 5,
      category: ProductCategory.CRAFTS,
      images: {
        create: [
          { url: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800', order: 0 },
        ],
      },
    },
  });

  await prisma.product.create({
    data: {
      artistId: artistProfile1.id,
      title: '艺术疗愈手册 / Art Therapy Workbook',
      description: '专为成人设计的艺术疗愈练习手册，包含30个引导性绘画与书写练习，帮助情绪整理与自我探索。配有插图与说明。\n\nA guided workbook with 30 structured art therapy exercises for adults. Covers emotion mapping, gratitude drawing, and expressive journalling. Illustrated throughout. A4 softcover, 120 pages.',
      price: 128.00,
      stock: 20,
      category: ProductCategory.OTHER,
      images: {
        create: [
          { url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800', order: 0 },
          { url: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800', order: 1 },
        ],
      },
    },
  });

  // Artist 2 — Mei Zhang (digital art / merchandise)
  const product4 = await prisma.product.create({
    data: {
      artistId: artistProfile2.id,
      title: '《呼吸》数字版画 / "Breathe" Digital Art Print',
      description: '数字插画版画，主题为正念呼吸。高品质哑光纸打印，A3尺寸，附签名证书。适合治疗室或家居装饰。\n\nHigh-resolution digital illustration printed on premium matte fine-art paper (A3). The piece visualises a mindful breath — gentle waves expanding outward from a single point. Signed certificate of authenticity included.',
      price: 320.00,
      stock: 15,
      category: ProductCategory.DIGITAL_ART,
      images: {
        create: [
          { url: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=800', order: 0 },
          { url: 'https://images.unsplash.com/photo-1549490349-8643362247b5?w=800', order: 1 },
        ],
      },
    },
  });

  const product5 = await prisma.product.create({
    data: {
      artistId: artistProfile2.id,
      title: '手工陶瓷疗愈马克杯 / Handmade Ceramic Therapy Mug',
      description: '纯手工拉坯陶瓷马克杯，釉色温柔，握感舒适。每只独一无二，略有差异。容量约350ml，微波炉及洗碗机安全。\n\nHand-thrown ceramic mug in calming sage glaze. Each piece is unique with natural variations. Approx. 350ml capacity. Microwave and dishwasher safe. Designed to make everyday rituals feel intentional.',
      price: 198.00,
      stock: 8,
      category: ProductCategory.MERCHANDISE,
      images: {
        create: [
          { url: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800', order: 0 },
          { url: 'https://images.unsplash.com/photo-1572119865084-43c285814d63?w=800', order: 1 },
        ],
      },
    },
  });

  await prisma.product.create({
    data: {
      artistId: artistProfile2.id,
      title: '正念彩绘套装 / Mindfulness Watercolour Set',
      description: '入门级水彩套装，专为艺术疗愈课程设计，包含12色固体水彩、两支画笔、调色盘及说明卡。适合无绘画基础的成人使用。\n\nA starter watercolour kit designed for art therapy sessions. Includes 12 solid pigment pans, 2 brushes, a ceramic palette, and a getting-started instruction card. Non-toxic, suitable for adults with no prior painting experience.',
      price: 158.00,
      stock: 0,
      category: ProductCategory.MERCHANDISE,
      images: {
        create: [
          { url: 'https://images.unsplash.com/photo-1503455637927-730bce8583c0?w=800', order: 0 },
        ],
      },
    },
  });

  console.log('✓ Products created');

  // ─── Sample cart item for client1 ─────────────────────────────────────────
  await prisma.cartItem.create({
    data: {
      userId: client1.id,
      productId: product4.id,
      quantity: 1,
    },
  });

  await prisma.cartItem.create({
    data: {
      userId: client1.id,
      productId: product5.id,
      quantity: 2,
    },
  });

  console.log('✓ Sample cart items created');

  // ─── New MEMBER System (Side-by-Side Test) ───────────────────────────────
  const memberUser = await prisma.user.create({
    data: {
      email: 'member@arttherapy.dev',
      passwordHash,
      role: Role.MEMBER,
      firstName: 'Jamie',
      lastName: 'Doe',
    }
  });

  const memberProfile = await prisma.userProfile.create({
    data: {
      userId: memberUser.id,
      bio: 'A multidisciplinary therapist and artificer using painting and pottery to explore healing.',
      locationCity: 'Seattle, WA',
      certificates: {
        create: [
          { type: CertificateType.THERAPIST, status: CertificateStatus.APPROVED },
          { type: CertificateType.ARTIFICER, status: CertificateStatus.APPROVED }
        ]
      }
    }
  });

  await prisma.product.create({
    data: {
      userProfileId: memberProfile.id,
      title: 'Therapeutic Ceramic Bowl',
      description: 'Hand-crafted bowl used for mindful eating practices.',
      price: 45.00,
      stock: 5,
      category: ProductCategory.CRAFTS,
    }
  });

  console.log('✓ MEMBER test profile and product created');

  console.log('\n✅ Seed complete!\n');
  console.log('Test accounts — password for all: password123');
  console.log('─────────────────────────────────────────────────');
  console.log('Admin:        admin@arttherapy.dev');
  console.log('Therapist 1:  therapist@arttherapy.dev   (Sarah Chen)');
  console.log('Therapist 2:  therapist2@arttherapy.dev  (Marcus Webb)');
  console.log('Therapist 3:  therapist3@arttherapy.dev  (Priya Patel)');
  console.log('Client 1:     client@arttherapy.dev      (Alex Rivera)');
  console.log('Client 2:     client2@arttherapy.dev     (Jordan Kim)');
  console.log('Artist 1:     artist@arttherapy.dev      (Li Wei)');
  console.log('Artist 2:     artist2@arttherapy.dev     (Mei Zhang)');
  console.log('Member 1:     member@arttherapy.dev      (Jamie Doe)');
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
