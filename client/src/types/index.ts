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