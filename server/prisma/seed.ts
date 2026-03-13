/// <reference types="node" />
import 'dotenv/config';
import path from 'path';
import { promises as fs } from 'fs';
import bcrypt from 'bcryptjs';
import {
  PrismaClient,
  Role,
  ParticipantStatus,
  PaymentProvider,
  PaymentStatus,
  OrderStatus,
  AddressTag,
  ProfileStatus,
  CertificateType,
  CertificateStatus,
  TherapyPlanType,
  TherapyPlanStatus,
  SessionMedium,
  ArtSalonSubType,
  ProductCategory,
  ProductStatus,
} from '@prisma/client';

const prisma = new PrismaClient();

const SEED_PASSWORD = 'password123';

const resolveRepoRoot = () => {
  const cwd = process.cwd();
  return path.basename(cwd).toLowerCase() === 'server'
    ? path.resolve(cwd, '..')
    : cwd;
};

const REPO_ROOT = resolveRepoRoot();
const CLIENT_PUBLIC_ROOT = path.join(REPO_ROOT, 'client', 'public');

type AssetSeed = {
  url: string;
  relativePath: string;
};

type MemberSeed = {
  key: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  city: string;
  specialties: string[];
  bioZh: string;
  bioEn: string;
  certs: CertificateType[];
  consultEnabled: boolean;
  sessionPrice?: number;
  sessionLength?: number;
  hourlyConsultFee?: number;
  avatarPath: string;
};

type PlanSeed = {
  ownerKey: string;
  type: TherapyPlanType;
  status: TherapyPlanStatus;
  titleZh: string;
  titleEn: string;
  sloganZh?: string;
  sloganEn?: string;
  introductionZh: string;
  introductionEn: string;
  startTime: Date;
  endTime?: Date | null;
  location: string;
  contactInfo: string;
  maxParticipants?: number | null;
  price?: number | null;
  artSalonSubType?: ArtSalonSubType | null;
  sessionMedium?: SessionMedium | null;
  posterUrl: string;
  consultDateStart?: string;
  consultDateEnd?: string;
  consultWorkStartMin?: number;
  consultWorkEndMin?: number;
  consultTimezone?: string;
  publishedAt?: Date | null;
  submittedAt?: Date | null;
  reviewedAt?: Date | null;
};

type ProductSeed = {
  ownerKey: string;
  titleZh: string;
  titleEn: string;
  descriptionZh: string;
  descriptionEn: string;
  category: ProductCategory;
  price: number;
  stock: number;
  status: ProductStatus;
  posterUrl: string;
  submittedAt?: Date | null;
  reviewedAt?: Date | null;
};

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

const addHours = (date: Date, hours: number) => {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
};

const toUtc8DateOnly = (date: Date): string => {
  const shifted = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
};

const toUtc8Minutes = (date: Date): number => {
  const shifted = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  return shifted.getUTCHours() * 60 + shifted.getUTCMinutes();
};

const combineUtc8DateAndMinutes = (dateOnly: string, minutes: number): Date => {
  const [year, month, day] = dateOnly.split('-').map(Number);
  const utcMs =
    Date.UTC(year, month - 1, day, 0, 0, 0, 0) +
    (minutes - 8 * 60) * 60 * 1000;
  return new Date(utcMs);
};

const PUBLIC_RELEASE_STATUSES = new Set<TherapyPlanStatus>([
  TherapyPlanStatus.PUBLISHED,
  TherapyPlanStatus.SIGN_UP_CLOSED,
  TherapyPlanStatus.IN_PROGRESS,
  TherapyPlanStatus.FINISHED,
  TherapyPlanStatus.IN_GALLERY,
]);

const buildPlanReviewTimeline = (plan: PlanSeed) => {
  if (!PUBLIC_RELEASE_STATUSES.has(plan.status)) {
    return {
      publishedAt: null as Date | null,
      reviewedAt: null as Date | null,
      submittedAt: null as Date | null,
    };
  }

  const publishedAt = plan.publishedAt ?? plan.startTime;
  const reviewedAt = plan.reviewedAt ?? publishedAt;
  const submittedAt = plan.submittedAt ?? new Date(reviewedAt.getTime() - 60 * 60 * 1000);

  return { publishedAt, reviewedAt, submittedAt };
};

const buildProductReviewTimeline = (product: ProductSeed) => {
  if (product.status !== ProductStatus.PUBLISHED) {
    return {
      reviewedAt: null as Date | null,
      submittedAt: null as Date | null,
    };
  }

  const reviewedAt = product.reviewedAt ?? new Date();
  const submittedAt = product.submittedAt ?? new Date(reviewedAt.getTime() - 60 * 60 * 1000);
  return { reviewedAt, submittedAt };
};

const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

const ensureAsset = async (asset: AssetSeed): Promise<string> => {
  const absolutePath = path.join(CLIENT_PUBLIC_ROOT, asset.relativePath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });

  if (!(await fileExists(absolutePath))) {
    const response = await fetch(asset.url, {
      headers: { 'User-Agent': 'ArtTherapySeedBot/1.0' },
    });
    if (!response.ok) {
      throw new Error(`Failed to download asset ${asset.url}: HTTP ${response.status}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(absolutePath, buffer);
  }

  return `/${asset.relativePath.replace(/\\/g, '/')}`;
};

const resetDatabase = async () => {
  await prisma.$executeRawUnsafe(`
DO $do$
DECLARE
  stmt text;
BEGIN
  SELECT
    'TRUNCATE TABLE ' ||
    string_agg(format('%I.%I', schemaname, tablename), ', ') ||
    ' RESTART IDENTITY CASCADE'
  INTO stmt
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename <> '_prisma_migrations';

  IF stmt IS NOT NULL THEN
    EXECUTE stmt;
  END IF;
END
$do$;
`);
};

async function main() {
  console.log('[Seed] Starting deterministic full reset seed...');

  const avatarAssets: AssetSeed[] = [
    { url: 'https://randomuser.me/api/portraits/women/44.jpg', relativePath: 'seed/avatars/member-01.jpg' },
    { url: 'https://randomuser.me/api/portraits/men/32.jpg', relativePath: 'seed/avatars/member-02.jpg' },
    { url: 'https://randomuser.me/api/portraits/women/68.jpg', relativePath: 'seed/avatars/member-03.jpg' },
    { url: 'https://randomuser.me/api/portraits/men/65.jpg', relativePath: 'seed/avatars/member-04.jpg' },
    { url: 'https://randomuser.me/api/portraits/women/21.jpg', relativePath: 'seed/avatars/member-05.jpg' },
    { url: 'https://randomuser.me/api/portraits/men/77.jpg', relativePath: 'seed/avatars/member-06.jpg' },
    { url: 'https://randomuser.me/api/portraits/women/12.jpg', relativePath: 'seed/avatars/member-07.jpg' },
    { url: 'https://randomuser.me/api/portraits/men/54.jpg', relativePath: 'seed/avatars/member-08.jpg' },
  ];

  const therapyPosterAssets: AssetSeed[] = Array.from({ length: 10 }, (_, index) => ({
    url: `https://picsum.photos/seed/therapy-plan-${index + 1}/1280/720`,
    relativePath: `seed/posters/therapy-${String(index + 1).padStart(2, '0')}.jpg`,
  }));

  const productPosterAssets: AssetSeed[] = Array.from({ length: 5 }, (_, index) => ({
    url: `https://picsum.photos/seed/product-poster-${index + 1}/1280/720`,
    relativePath: `seed/posters/product-${String(index + 1).padStart(2, '0')}.jpg`,
  }));

  const [avatarUrls, therapyPosterUrls, productPosterUrls] = await Promise.all([
    Promise.all(avatarAssets.map(ensureAsset)),
    Promise.all(therapyPosterAssets.map(ensureAsset)),
    Promise.all(productPosterAssets.map(ensureAsset)),
  ]);

  console.log('[Seed] Local seed media prepared in client/public/seed');

  await resetDatabase();
  console.log('[Seed] Database reset complete');

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@arttherapy.seed',
      passwordHash,
      role: Role.ADMIN,
      firstName: 'System',
      lastName: 'Admin',
      phone: '+86 13900000000',
      avatarUrl: '/logo_new.jpg',
    },
  });

  const members: MemberSeed[] = [
    {
      key: 'mei_lin',
      email: 'mei.lin@arttherapy.seed',
      firstName: 'Mei',
      lastName: 'Lin',
      phone: '+86 13800000001',
      city: 'Shanghai',
      specialties: ['Anxiety', 'Mindfulness', 'Emotion Regulation'],
      bioZh: '注册艺术治疗师，专注焦虑与情绪管理。',
      bioEn: 'Registered art therapist focused on anxiety and emotional regulation.',
      certs: [CertificateType.THERAPIST],
      consultEnabled: true,
      sessionPrice: 680,
      sessionLength: 60,
      hourlyConsultFee: 980,
      avatarPath: avatarUrls[0],
    },
    {
      key: 'ethan_zhang',
      email: 'ethan.zhang@arttherapy.seed',
      firstName: 'Ethan',
      lastName: 'Zhang',
      phone: '+86 13800000002',
      city: 'Beijing',
      specialties: ['Grief', 'Life Transition', 'Support Groups'],
      bioZh: '咨询师，擅长丧失与人生转折议题。',
      bioEn: 'Counselor specializing in grief and life transition support.',
      certs: [CertificateType.COUNSELOR],
      consultEnabled: true,
      sessionPrice: 620,
      sessionLength: 60,
      hourlyConsultFee: 900,
      avatarPath: avatarUrls[1],
    },
    {
      key: 'iris_chen',
      email: 'iris.chen@arttherapy.seed',
      firstName: 'Iris',
      lastName: 'Chen',
      phone: '+86 13800000003',
      city: 'Hangzhou',
      specialties: ['Trauma Recovery', 'Creative Coaching'],
      bioZh: '治疗师兼艺术创作者，提供创伤修复与创作指导。',
      bioEn: 'Therapist and artist offering trauma recovery and creative coaching.',
      certs: [CertificateType.THERAPIST, CertificateType.ARTIFICER],
      consultEnabled: true,
      sessionPrice: 720,
      sessionLength: 75,
      hourlyConsultFee: 1080,
      avatarPath: avatarUrls[2],
    },
    {
      key: 'noah_wu',
      email: 'noah.wu@arttherapy.seed',
      firstName: 'Noah',
      lastName: 'Wu',
      phone: '+86 13800000004',
      city: 'Shenzhen',
      specialties: ['Ceramics', 'Printmaking', 'Handmade Goods'],
      bioZh: '手作艺术家，专注陶艺与疗愈文创。',
      bioEn: 'Handmade artist focused on ceramics and therapeutic crafts.',
      certs: [CertificateType.ARTIFICER],
      consultEnabled: false,
      avatarPath: avatarUrls[3],
    },
    {
      key: 'luna_wang',
      email: 'luna.wang@arttherapy.seed',
      firstName: 'Luna',
      lastName: 'Wang',
      phone: '+86 13800000005',
      city: 'Chengdu',
      specialties: ['Family Dynamics', 'Stress Recovery'],
      bioZh: '咨询师，擅长家庭关系与压力复原。',
      bioEn: 'Counselor specializing in family dynamics and stress recovery.',
      certs: [CertificateType.COUNSELOR],
      consultEnabled: true,
      sessionPrice: 590,
      sessionLength: 50,
      hourlyConsultFee: 860,
      avatarPath: avatarUrls[4],
    },
    {
      key: 'owen_qi',
      email: 'owen.qi@arttherapy.seed',
      firstName: 'Owen',
      lastName: 'Qi',
      phone: '+86 13800000006',
      city: 'Nanjing',
      specialties: ['Painting', 'Material Design', 'Art Merchandise'],
      bioZh: '视觉艺术家，专注绘画与疗愈周边设计。',
      bioEn: 'Visual artist focused on painting and therapeutic merchandise design.',
      certs: [CertificateType.ARTIFICER],
      consultEnabled: false,
      avatarPath: avatarUrls[5],
    },
    {
      key: 'sophia_xu',
      email: 'sophia.xu@arttherapy.seed',
      firstName: 'Sophia',
      lastName: 'Xu',
      phone: '+86 13800000007',
      city: 'Guangzhou',
      specialties: ['Youth Therapy', 'Art Journaling'],
      bioZh: '青年艺术治疗师，擅长表达性书写与绘画。',
      bioEn: 'Youth art therapist specializing in expressive journaling and drawing.',
      certs: [CertificateType.THERAPIST],
      consultEnabled: true,
      sessionPrice: 650,
      sessionLength: 60,
      hourlyConsultFee: 920,
      avatarPath: avatarUrls[6],
    },
    {
      key: 'kevin_gao',
      email: 'kevin.gao@arttherapy.seed',
      firstName: 'Kevin',
      lastName: 'Gao',
      phone: '+86 13800000008',
      city: 'Xi’an',
      specialties: ['Digital Art', 'Brand Illustration'],
      bioZh: '数字艺术师，擅长情绪主题视觉创作。',
      bioEn: 'Digital artist creating emotion-focused visual works.',
      certs: [CertificateType.ARTIFICER],
      consultEnabled: false,
      avatarPath: avatarUrls[7],
    },
  ];

  const memberIdentityMap: Record<string, { userId: string; profileId: string }> = {};

  for (const [index, member] of members.entries()) {
    const user = await prisma.user.create({
      data: {
        email: member.email,
        passwordHash,
        role: Role.MEMBER,
        firstName: member.firstName,
        lastName: member.lastName,
        phone: member.phone,
        avatarUrl: member.avatarPath,
      },
    });

    const profile = await prisma.userProfile.create({
      data: {
        userId: user.id,
        bio: `${member.bioZh} ${member.bioEn}`,
        locationCity: member.city,
        specialties: member.specialties,
        profileStatus: ProfileStatus.APPROVED,
        consultEnabled: member.consultEnabled,
        sessionPrice: member.sessionPrice ?? null,
        sessionLength: member.sessionLength ?? null,
        hourlyConsultFee: member.hourlyConsultFee ?? null,
        featuredImageUrl: member.avatarPath,
        profileViews: 80 + index * 23,
        rating: 4.6 + (index % 3) * 0.1,
      },
    });

    await prisma.userCertificate.createMany({
      data: member.certs.map((type) => ({
        profileId: profile.id,
        type,
        status: CertificateStatus.APPROVED,
        tosAcceptedAt: new Date(),
        reviewedAt: new Date(),
      })),
      skipDuplicates: true,
    });

    memberIdentityMap[member.key] = { userId: user.id, profileId: profile.id };
  }

  const planSeeds: PlanSeed[] = [
    {
      ownerKey: 'mei_lin',
      type: TherapyPlanType.PERSONAL_CONSULT,
      status: TherapyPlanStatus.PUBLISHED,
      titleZh: '情绪稳定一对一咨询',
      titleEn: '1-on-1 Emotional Stabilization Consult',
      sloganZh: '在安全空间里恢复内在秩序',
      sloganEn: 'Restore inner balance in a safe space',
      introductionZh: '通过结构化绘画与呼吸练习，帮助来访者快速识别触发点并建立稳定策略。',
      introductionEn: 'Structured art prompts and breathing exercises to identify triggers and build stabilization routines.',
      startTime: daysFromNow(10, 19, 0),
      location: 'Online / Tencent Meeting',
      contactInfo: 'wechat:mei_lin_seed',
      sessionMedium: SessionMedium.VIDEO,
      price: 399,
      posterUrl: therapyPosterUrls[0],
      publishedAt: daysAgo(14, 9, 0),
    },
    {
      ownerKey: 'ethan_zhang',
      type: TherapyPlanType.GROUP_CONSULT,
      status: TherapyPlanStatus.PUBLISHED,
      titleZh: '哀伤支持小组',
      titleEn: 'Grief Support Group',
      sloganZh: '让失落被看见，也让联结重新发生',
      sloganEn: 'Witness loss and rebuild connection',
      introductionZh: '8人以内的团体疗愈小组，结合叙事与拼贴，帮助成员安全表达并互相支持。',
      introductionEn: 'An 8-person support circle using narrative and collage for safe expression and peer support.',
      startTime: daysFromNow(12, 14, 0),
      endTime: daysFromNow(12, 16, 0),
      location: 'Beijing Healing Studio',
      contactInfo: 'service@arttherapy.seed',
      maxParticipants: 8,
      price: 299,
      posterUrl: therapyPosterUrls[1],
      publishedAt: daysAgo(12, 9, 30),
    },
    {
      ownerKey: 'iris_chen',
      type: TherapyPlanType.ART_SALON,
      status: TherapyPlanStatus.PUBLISHED,
      titleZh: '周末色彩疗愈沙龙',
      titleEn: 'Weekend Color Healing Salon',
      sloganZh: '用颜色讲述你今天的心情',
      sloganEn: 'Tell your mood through colors',
      introductionZh: '开放式艺术沙龙，适合初学者。提供材料与引导，完成个人情绪主题画作。',
      introductionEn: 'Open art salon for beginners with guided prompts and materials for mood-based painting.',
      startTime: daysFromNow(8, 15, 0),
      endTime: daysFromNow(8, 18, 0),
      location: 'Hangzhou Riverside Art Space',
      contactInfo: 'wechat:iris_salon',
      maxParticipants: 12,
      price: 199,
      artSalonSubType: ArtSalonSubType.PAINTING,
      posterUrl: therapyPosterUrls[2],
      publishedAt: daysAgo(10, 10, 0),
    },
    {
      ownerKey: 'luna_wang',
      type: TherapyPlanType.WELLNESS_RETREAT,
      status: TherapyPlanStatus.PUBLISHED,
      titleZh: '山林正念疗愈营',
      titleEn: 'Forest Mindfulness Retreat',
      sloganZh: '三天沉浸式身心修复',
      sloganEn: 'A 3-day immersive reset',
      introductionZh: '结合自然行走、团体绘画与静心写作，帮助参与者重建身心节奏。',
      introductionEn: 'Combines nature walks, group painting, and reflective writing for holistic recovery.',
      startTime: daysFromNow(25, 9, 0),
      endTime: daysFromNow(27, 17, 0),
      location: 'Chengdu Green Valley Camp',
      contactInfo: 'retreat@arttherapy.seed',
      maxParticipants: 20,
      price: 1299,
      posterUrl: therapyPosterUrls[3],
      publishedAt: daysAgo(9, 11, 0),
    },
    {
      ownerKey: 'sophia_xu',
      type: TherapyPlanType.PERSONAL_CONSULT,
      status: TherapyPlanStatus.SIGN_UP_CLOSED,
      titleZh: '青少年表达性绘画辅导',
      titleEn: 'Youth Expressive Art Guidance',
      sloganZh: '在画纸上找到说不出口的话',
      sloganEn: 'Find words through drawing',
      introductionZh: '面向青少年的一对一艺术辅导，围绕学习压力与自我认同建立表达路径。',
      introductionEn: 'One-on-one guidance for teens navigating school stress and identity through expressive drawing.',
      startTime: daysFromNow(3, 16, 0),
      location: 'Guangzhou Youth Therapy Center',
      contactInfo: 'wechat:sophia_youth',
      sessionMedium: SessionMedium.IN_PERSON,
      price: 420,
      posterUrl: therapyPosterUrls[4],
      publishedAt: daysAgo(8, 12, 0),
    },
    {
      ownerKey: 'mei_lin',
      type: TherapyPlanType.GROUP_CONSULT,
      status: TherapyPlanStatus.IN_PROGRESS,
      titleZh: '焦虑调节成长营',
      titleEn: 'Anxiety Regulation Cohort',
      sloganZh: '把焦虑变成可管理的信号',
      sloganEn: 'Turn anxiety into manageable signals',
      introductionZh: '6周小组项目，持续追踪参与者的情绪模式并通过创作练习形成稳定方案。',
      introductionEn: 'A 6-week cohort tracking emotional patterns and building practical regulation routines.',
      startTime: daysAgo(1, 19, 0),
      endTime: daysFromNow(1, 21, 0),
      location: 'Online / Tencent Meeting',
      contactInfo: 'cohort@arttherapy.seed',
      maxParticipants: 10,
      price: 260,
      posterUrl: therapyPosterUrls[5],
      publishedAt: daysAgo(20, 8, 30),
    },
    {
      ownerKey: 'ethan_zhang',
      type: TherapyPlanType.ART_SALON,
      status: TherapyPlanStatus.FINISHED,
      titleZh: '书法静心工作坊',
      titleEn: 'Calligraphy Calm Workshop',
      sloganZh: '一笔一划回到当下',
      sloganEn: 'Return to the present stroke by stroke',
      introductionZh: '以书法和呼吸节奏配合，帮助参与者建立专注与身体觉察。',
      introductionEn: 'Calligraphy with paced breathing to rebuild focus and body awareness.',
      startTime: daysAgo(20, 14, 0),
      endTime: addHours(daysAgo(20, 14, 0), 3),
      location: 'Beijing Hutong Studio',
      contactInfo: 'workshop@arttherapy.seed',
      maxParticipants: 12,
      price: 180,
      artSalonSubType: ArtSalonSubType.CALLIGRAPHY,
      posterUrl: therapyPosterUrls[6],
      publishedAt: daysAgo(30, 10, 30),
    },
    {
      ownerKey: 'luna_wang',
      type: TherapyPlanType.WELLNESS_RETREAT,
      status: TherapyPlanStatus.IN_GALLERY,
      titleZh: '溪谷疗愈静修营',
      titleEn: 'Valley Healing Retreat',
      sloganZh: '在自然中重建呼吸与睡眠',
      sloganEn: 'Rebuild breath and sleep in nature',
      introductionZh: '闭环式疗愈营，以自然地景艺术和身心练习促进长期复原。',
      introductionEn: 'A closed-loop retreat using eco-art and somatic routines for long-term recovery.',
      startTime: daysAgo(45, 9, 0),
      endTime: daysAgo(43, 16, 0),
      location: 'Qingcheng Mountain Retreat Base',
      contactInfo: 'retreat2@arttherapy.seed',
      maxParticipants: 16,
      price: 1499,
      posterUrl: therapyPosterUrls[7],
      publishedAt: daysAgo(60, 10, 0),
    },
    {
      ownerKey: 'iris_chen',
      type: TherapyPlanType.GROUP_CONSULT,
      status: TherapyPlanStatus.IN_GALLERY,
      titleZh: '创作复原小组',
      titleEn: 'Creative Recovery Group',
      sloganZh: '一起创作，一起复原',
      sloganEn: 'Create together, recover together',
      introductionZh: '围绕关系创伤与压力复原的团体创作课程，已完成三期。',
      introductionEn: 'A group program for relationship trauma and stress recovery through guided creation.',
      startTime: daysAgo(14, 13, 0),
      endTime: addHours(daysAgo(14, 13, 0), 2),
      location: 'Hangzhou Community Lab',
      contactInfo: 'group@arttherapy.seed',
      maxParticipants: 10,
      price: 230,
      posterUrl: therapyPosterUrls[8],
      publishedAt: daysAgo(32, 9, 0),
    },
    {
      ownerKey: 'sophia_xu',
      type: TherapyPlanType.PERSONAL_CONSULT,
      status: TherapyPlanStatus.FINISHED,
      titleZh: '学习压力缓解咨询',
      titleEn: 'Academic Stress Relief Consult',
      sloganZh: '从焦虑循环中抽离出来',
      sloganEn: 'Step out of the anxiety loop',
      introductionZh: '通过视觉日记和短时绘画练习，帮助来访者改善学习阶段的压力感受。',
      introductionEn: 'Visual journaling and short drawing exercises for academic stress reduction.',
      startTime: daysAgo(30, 18, 0),
      endTime: addHours(daysAgo(30, 18, 0), 1),
      location: 'Online / Tencent Meeting',
      contactInfo: 'consult@sophia.seed',
      sessionMedium: SessionMedium.VIDEO,
      price: 360,
      posterUrl: therapyPosterUrls[9],
      publishedAt: daysAgo(40, 11, 0),
    },
  ];

  for (const plan of planSeeds) {
    const owner = memberIdentityMap[plan.ownerKey];
    if (!owner) {
      throw new Error(`Missing owner profile for plan seed ownerKey=${plan.ownerKey}`);
    }
    const timeline = buildPlanReviewTimeline(plan);
    const isPersonalConsult = plan.type === TherapyPlanType.PERSONAL_CONSULT;

    const fallbackConsultEndTime = plan.endTime ?? addHours(plan.startTime, 1);
    const consultDateStart =
      plan.consultDateStart ??
      (isPersonalConsult ? toUtc8DateOnly(plan.startTime) : undefined);
    const consultDateEnd =
      plan.consultDateEnd ??
      (isPersonalConsult ? toUtc8DateOnly(fallbackConsultEndTime) : undefined);
    const consultWorkStartMin =
      plan.consultWorkStartMin ??
      (isPersonalConsult ? toUtc8Minutes(plan.startTime) : undefined);
    let consultWorkEndMin =
      plan.consultWorkEndMin ??
      (isPersonalConsult ? toUtc8Minutes(fallbackConsultEndTime) : undefined);

    if (
      isPersonalConsult &&
      consultWorkStartMin != null &&
      consultWorkEndMin != null &&
      consultWorkEndMin <= consultWorkStartMin
    ) {
      consultWorkEndMin = Math.min(1440, consultWorkStartMin + 60);
    }

    const derivedStartTime =
      isPersonalConsult && consultDateStart && consultWorkStartMin != null
        ? combineUtc8DateAndMinutes(consultDateStart, consultWorkStartMin)
        : plan.startTime;
    const derivedEndTime =
      isPersonalConsult && consultDateEnd && consultWorkEndMin != null
        ? combineUtc8DateAndMinutes(consultDateEnd, consultWorkEndMin)
        : plan.endTime ?? null;

    await prisma.therapyPlan.create({
      data: {
        userProfileId: owner.profileId,
        type: plan.type,
        status: plan.status,
        title: plan.titleZh,
        titleI18n: { zh: plan.titleZh, en: plan.titleEn },
        slogan: plan.sloganZh ?? null,
        sloganI18n: plan.sloganZh || plan.sloganEn ? { zh: plan.sloganZh ?? '', en: plan.sloganEn ?? '' } : null,
        introduction: plan.introductionZh,
        introductionI18n: { zh: plan.introductionZh, en: plan.introductionEn },
        startTime: derivedStartTime,
        endTime: derivedEndTime,
        consultDateStart: isPersonalConsult && consultDateStart ? new Date(`${consultDateStart}T00:00:00.000Z`) : null,
        consultDateEnd: isPersonalConsult && consultDateEnd ? new Date(`${consultDateEnd}T00:00:00.000Z`) : null,
        consultWorkStartMin: isPersonalConsult ? consultWorkStartMin ?? null : null,
        consultWorkEndMin: isPersonalConsult ? consultWorkEndMin ?? null : null,
        consultTimezone: isPersonalConsult ? plan.consultTimezone ?? 'Asia/Shanghai' : null,
        location: plan.location,
        contactInfo: plan.contactInfo,
        maxParticipants: plan.maxParticipants ?? null,
        price: plan.price ?? null,
        artSalonSubType: plan.artSalonSubType ?? null,
        sessionMedium: plan.sessionMedium ?? null,
        defaultPosterId: null,
        posterUrl: plan.posterUrl,
        publishedAt: timeline.publishedAt,
        submittedAt: timeline.submittedAt,
        reviewedAt: timeline.reviewedAt,
      },
    });
  }

  const productSeeds: ProductSeed[] = [
    {
      ownerKey: 'iris_chen',
      titleZh: '情绪拼贴工具包',
      titleEn: 'Emotion Collage Toolkit',
      descriptionZh: '内含高质感纸材、情绪贴纸与引导卡，适合个人和小组疗愈活动使用。',
      descriptionEn: 'Includes premium papers, emotion stickers, and prompt cards for personal or group sessions.',
      category: ProductCategory.MERCHANDISE,
      price: 199,
      stock: 30,
      status: ProductStatus.PUBLISHED,
      posterUrl: productPosterUrls[0],
    },
    {
      ownerKey: 'noah_wu',
      titleZh: '手作冥想陶杯',
      titleEn: 'Handmade Meditation Cup',
      descriptionZh: '手工拉坯陶杯，圆润握感，适合日常正念饮用仪式。',
      descriptionEn: 'Wheel-thrown ceramic cup with a soft grip for daily mindfulness rituals.',
      category: ProductCategory.CRAFTS,
      price: 269,
      stock: 18,
      status: ProductStatus.PUBLISHED,
      posterUrl: productPosterUrls[1],
    },
    {
      ownerKey: 'owen_qi',
      titleZh: '疗愈色卡海报套组',
      titleEn: 'Healing Color Poster Set',
      descriptionZh: '五张主题色卡海报，适用于工作坊空间布置与家庭情绪角。',
      descriptionEn: 'Five themed color posters for workshop decoration or home emotional corners.',
      category: ProductCategory.PAINTING,
      price: 159,
      stock: 45,
      status: ProductStatus.PUBLISHED,
      posterUrl: productPosterUrls[2],
    },
    {
      ownerKey: 'kevin_gao',
      titleZh: '数字疗愈壁纸包',
      titleEn: 'Digital Healing Wallpaper Pack',
      descriptionZh: '10张高清数字壁纸，围绕呼吸、放松与能量恢复主题创作。',
      descriptionEn: 'Set of 10 high-resolution digital wallpapers themed around breathing and restoration.',
      category: ProductCategory.DIGITAL_ART,
      price: 99,
      stock: 999,
      status: ProductStatus.PUBLISHED,
      posterUrl: productPosterUrls[3],
    },
    {
      ownerKey: 'iris_chen',
      titleZh: '静心线条画原作',
      titleEn: 'Mindful Linework Original',
      descriptionZh: '原创线条绘画作品，装裱完成，适合疗愈空间陈设。',
      descriptionEn: 'Original framed linework artwork suitable for therapy and wellness spaces.',
      category: ProductCategory.PAINTING,
      price: 680,
      stock: 6,
      status: ProductStatus.PUBLISHED,
      posterUrl: productPosterUrls[4],
    },
  ];

  for (const product of productSeeds) {
    const owner = memberIdentityMap[product.ownerKey];
    if (!owner) {
      throw new Error(`Missing owner profile for product seed ownerKey=${product.ownerKey}`);
    }
    const reviewTimeline = buildProductReviewTimeline(product);

    await prisma.product.create({
      data: {
        userProfileId: owner.profileId,
        title: product.titleZh,
        titleI18n: { zh: product.titleZh, en: product.titleEn },
        description: product.descriptionZh,
        descriptionI18n: { zh: product.descriptionZh, en: product.descriptionEn },
        defaultPosterId: null,
        posterUrl: product.posterUrl,
        videoUrl: null,
        price: product.price,
        stock: product.stock,
        category: product.category,
        status: product.status,
        submittedAt: reviewTimeline.submittedAt,
        reviewedAt: reviewTimeline.reviewedAt,
        images: {
          create: [{ url: product.posterUrl, order: 0 }],
        },
      },
    });
  }

  // Create a client user with purchased plans and products
  const client = await prisma.user.create({
    data: {
      email: 'client@arttherapy.seed',
      passwordHash,
      role: Role.MEMBER,
      firstName: 'Alice',
      lastName: 'Chen',
      phone: '+86 13800138000',
      avatarUrl: avatarUrls[7],
    },
  });

  // Get some published plans and products
  const publishedPlans = await prisma.therapyPlan.findMany({
    where: { status: { in: [TherapyPlanStatus.PUBLISHED, TherapyPlanStatus.IN_PROGRESS] } },
    take: 3,
  });

  const publishedProducts = await prisma.product.findMany({
    where: { status: ProductStatus.PUBLISHED },
    take: 2,
  });

  // Create plan signups
  for (const plan of publishedPlans) {
    const amountCents = plan.price ? Math.round(Number(plan.price) * 100) : 0;
    const platformFee = Math.round(amountCents * 0.1);

    await prisma.therapyPlanParticipant.create({
      data: {
        userId: client.id,
        planId: plan.id,
        status: ParticipantStatus.SIGNED_UP,
        payment: amountCents > 0
          ? {
            create: {
              provider: PaymentProvider.ALIPAY,
              amount: amountCents,
              currency: 'cny',
              platformFeeAmount: platformFee,
              therapistPayoutAmount: amountCents - platformFee,
              status: PaymentStatus.SUCCEEDED,
            },
          }
          : undefined,
      },
    });
  }

  // Create product orders
  if (publishedProducts.length > 0) {
    const totalAmount = publishedProducts.reduce(
      (sum, product) => sum + Math.round(Number(product.price) * 100),
      0,
    );

    await prisma.order.create({
      data: {
        userId: client.id,
        status: OrderStatus.DELIVERED,
        totalAmount,
        province: 'Shanghai',
        city: 'Shanghai',
        district: 'Pudong',
        addressDetail: 'Seed Road 100',
        recipientName: `${client.firstName} ${client.lastName}`,
        phone: client.phone ?? '+86 13800138000',
        postalCode: '200000',
        addressTag: AddressTag.HOME,
        items: {
          create: publishedProducts.map((product) => ({
            productId: product.id,
            quantity: 1,
            price: Math.round(Number(product.price) * 100),
          })),
        },
        payment: {
          create: {
            provider: PaymentProvider.ALIPAY,
            amount: totalAmount,
            currency: 'cny',
            status: PaymentStatus.SUCCEEDED,
          },
        },
      },
    });
  }

  const [adminCount, memberCount, profileCount, certCount, planCount, productCount] = await Promise.all([
    prisma.user.count({ where: { role: Role.ADMIN } }),
    prisma.user.count({ where: { role: Role.MEMBER } }),
    prisma.userProfile.count(),
    prisma.userCertificate.count(),
    prisma.therapyPlan.count(),
    prisma.product.count(),
  ]);

  console.log('[Seed] Complete');
  console.log(`[Seed] Admins: ${adminCount}`);
  console.log(`[Seed] Members: ${memberCount}`);
  console.log(`[Seed] Profiles: ${profileCount}`);
  console.log(`[Seed] Certificates: ${certCount}`);
  console.log(`[Seed] Therapy plans: ${planCount}`);
  console.log(`[Seed] Products: ${productCount}`);
  console.log('[Seed] Default password for all seeded accounts: password123');
  console.log(`[Seed] Admin login: ${admin.email}`);
  console.log(`[Seed] Client with purchases: ${client.email}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error('[Seed] Failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
