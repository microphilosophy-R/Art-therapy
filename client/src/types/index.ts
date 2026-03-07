export type UserRole = 'ADMIN' | 'MEMBER';
export interface LocalizedText {
  zh?: string;
  en?: string;
}
export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'CANCELLED' | 'COMPLETED';
export type SessionMedium = 'IN_PERSON' | 'VIDEO';
export type StripeAccountStatus = 'NOT_CONNECTED' | 'ONBOARDING_IN_PROGRESS' | 'ACTIVE' | 'RESTRICTED' | 'DISABLED';
export type ProfileStatus = 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';

export interface TherapistGalleryImage {
  id: string;
  therapistId: string;
  url: string;
  order: number;
  createdAt: string;
}
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  avatarUrl?: string;
  phone?: string;
  createdAt: string;
  approvedCertificates?: string[];
}
export interface RefundPolicy {
  id: string;
  therapistId: string;
  fullRefundHoursThreshold: number;
  allowPartialRefund: boolean;
  partialRefundPercent?: number;
  policyDescription: string;
}
export interface TherapistProfile {
  id: string;
  userId: string;
  user: User;
  bio: string;
  specialties: string[];
  sessionPrice: number;
  sessionLength: number;
  locationCity: string;
  isAccepting: boolean;
  rating?: number;
  stripeAccountId?: string;
  stripeAccountStatus: StripeAccountStatus;
  refundPolicy?: RefundPolicy;
  reviews?: Review[];
  reviewCount?: number;
  featuredImageUrl?: string;
  socialMediaLink?: string;
  qrCodeUrl?: string;
  profileStatus: ProfileStatus;
  rejectionReason?: string | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  consultEnabled: boolean;
  certificateUrl?: string | null;
  hourlyConsultFee?: number | null;
  galleryImages?: TherapistGalleryImage[];
}
export interface Appointment {
  id: string;
  clientId: string;
  therapistId: string;
  therapist?: TherapistProfile;
  client?: User;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  medium: SessionMedium;
  clientNotes?: string;
  createdAt: string;
  payment?: Payment;
}
export interface Payment {
  id: string;
  appointmentId: string;
  stripePaymentIntentId: string;
  stripeChargeId?: string;
  amount: number;
  currency: string;
  platformFeeAmount: number;
  therapistPayoutAmount: number;
  status: 'PENDING' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED' | 'CANCELLED';
  refundedAt?: string;
  refundAmount?: number;
  createdAt: string;
}
export interface Review {
  id: string;
  clientId: string;
  therapistId: string;
  client?: User;
  rating: number;
  comment?: string;
  createdAt: string;
}
export interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
}
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
export interface ApiError {
  message: string;
  statusCode: number;
  errors?: Record<string, string[]>;
}
export interface TherapistFilters {
  search?: string;
  specialty?: string;
  specialties?: string[];
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  medium?: SessionMedium;
  sortBy?: string;
  page?: number;
  limit?: number;
}

export interface AppointmentFilters {
  status?: AppointmentStatus[];
  page?: number;
  limit?: number;
}

// ─── Therapy Plans ────────────────────────────────────────────────────────────

export type TherapyPlanType =
  | 'PERSONAL_CONSULT'
  | 'GROUP_CONSULT'
  | 'ART_SALON'
  | 'WELLNESS_RETREAT';

export type TherapyPlanStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'PUBLISHED'
  | 'REJECTED'
  | 'SIGN_UP_CLOSED'
  | 'IN_PROGRESS'
  | 'FINISHED'
  | 'IN_GALLERY'
  | 'CANCELLED'
  | 'ARCHIVED';

export type ArtSalonSubType =
  | 'CALLIGRAPHY'
  | 'PAINTING'
  | 'DRAMA'
  | 'YOGA'
  | 'BOARD_GAMES'
  | 'CULTURAL_CONVERSATION';

export type MessageTrigger =
  | 'PLAN_SUBMITTED'
  | 'PLAN_APPROVED'
  | 'PLAN_REJECTED'
  | 'MANUAL'
  | 'CHAT'
  | 'APPOINTMENT_DEADLINE_WARNING'
  | 'APPOINTMENT_AUTO_CANCELLED'
  | 'PLAN_SIGNUP'
  | 'PLAN_SIGNUP_CANCELLED'
  | 'PLAN_STARTED'
  | 'PLAN_FINISHED'
  | 'PLAN_CANCELLED_BY_THERAPIST'
  | 'PROFILE_SUBMITTED'
  | 'PROFILE_APPROVED'
  | 'PROFILE_REJECTED';

export type ParticipantStatus = 'PENDING_PAYMENT' | 'SIGNED_UP' | 'CANCELLED';

export interface TherapyPlanParticipant {
  id: string;
  userId: string;
  user?: Pick<User, 'id' | 'firstName' | 'lastName' | 'avatarUrl'>;
  planId: string;
  status: ParticipantStatus;
  enrolledAt: string;
  payment?: any; // Add generic payment for now
}

export interface TherapyPlanEvent {
  id: string;
  planId: string;
  startTime: string;
  endTime?: string | null;
  title?: string | null;
  isAvailable: boolean;
  order: number;
}

export interface TherapyPlanImage {
  id: string;
  url: string;
  order: number;
}

export interface TherapyPlanPdf {
  id: string;
  url: string;
  name: string;
  order: number;
}

export interface TherapyPlan {
  id: string;
  therapistId: string;
  therapist?: TherapistProfile;
  type: TherapyPlanType;
  status: TherapyPlanStatus;
  title: string;
  titleI18n?: LocalizedText | null;
  slogan?: string;
  sloganI18n?: LocalizedText | null;
  introduction: string;
  introductionI18n?: LocalizedText | null;
  startTime: string;
  endTime?: string | null;
  consultDateStart?: string | null;
  consultDateEnd?: string | null;
  consultWorkStartMin?: number | null;
  consultWorkEndMin?: number | null;
  consultTimezone?: string | null;
  location: string;
  maxParticipants?: number | null;
  contactInfo: string;
  artSalonSubType?: ArtSalonSubType | null;
  sessionMedium?: SessionMedium | null;
  defaultPosterId?: number | null;
  posterUrl?: string | null;
  videoUrl?: string | null;
  price?: number | string | null;
  /** @deprecated Use pdfs array instead */
  attachmentUrl?: string | null;
  /** @deprecated Use pdfs array instead */
  attachmentName?: string | null;
  images?: TherapyPlanImage[];
  pdfs?: TherapyPlanPdf[];
  rejectionReason?: string | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  publishedAt?: string | null;
  participants?: TherapyPlanParticipant[];
  events?: TherapyPlanEvent[];
  _count?: {
    participants: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  senderId?: string | null;
  sender?: Pick<User, 'id' | 'firstName' | 'lastName'> | null;
  recipientId: string;
  body: string;
  trigger: MessageTrigger;
  isRead: boolean;
  readAt?: string | null;
  planId?: string | null;
  plan?: Pick<TherapyPlan, 'id' | 'title' | 'type' | 'status'> | null;
  conversationId?: string | null;
  createdAt: string;
}

export interface Conversation {
  id: string;
  peer: Pick<User, 'id' | 'firstName' | 'lastName' | 'avatarUrl'>;
  lastMessage: Message | null;
  unreadCount: number;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface TherapyPlanFilters {
  therapistId?: string;
  type?: TherapyPlanType | '';
  status?: TherapyPlanStatus | '';
  timeFilter?: 'upcoming' | 'past';
  role?: 'creator' | 'participant';
  sortBy?: 'startTime' | 'createdAt' | 'updatedAt';
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface TherapyPlanTemplate {
  id: string;
  createdById: string;
  createdBy?: Pick<User, 'id' | 'firstName' | 'lastName'>;
  type: TherapyPlanType;
  name: string;
  isPublic: boolean;
  data: Record<string, unknown>;
  createdAt: string;
}
