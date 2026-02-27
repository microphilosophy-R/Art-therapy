export type UserRole = 'CLIENT' | 'THERAPIST' | 'ADMIN';
export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
export type SessionMedium = 'IN_PERSON' | 'VIDEO';
export type StripeAccountStatus = 'NOT_CONNECTED' | 'ONBOARDING_IN_PROGRESS' | 'ACTIVE' | 'RESTRICTED' | 'DISABLED';
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  avatarUrl?: string;
  phone?: string;
  createdAt: string;
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
  | 'MANUAL';

export interface TherapyPlanParticipant {
  id: string;
  userId: string;
  user?: Pick<User, 'id' | 'firstName' | 'lastName' | 'avatarUrl'>;
  planId: string;
  enrolledAt: string;
}

export interface TherapyPlan {
  id: string;
  therapistId: string;
  therapist?: TherapistProfile;
  type: TherapyPlanType;
  status: TherapyPlanStatus;
  title: string;
  slogan?: string;
  introduction: string;
  startTime: string;
  endTime?: string | null;
  location: string;
  maxParticipants?: number | null;
  contactInfo: string;
  artSalonSubType?: ArtSalonSubType | null;
  sessionMedium?: SessionMedium | null;
  defaultPosterId?: number | null;
  posterUrl?: string | null;
  rejectionReason?: string | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  publishedAt?: string | null;
  participants?: TherapyPlanParticipant[];
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
  createdAt: string;
}

export interface TherapyPlanFilters {
  type?: TherapyPlanType | '';
  status?: TherapyPlanStatus | '';
  timeFilter?: 'upcoming' | 'past';
  page?: number;
  limit?: number;
}