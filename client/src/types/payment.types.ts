export type PaymentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'REFUNDED'
  | 'CANCELLED';
export interface CreatePaymentIntentResponse {
  clientSecret: string;
  paymentId: string;
}
export interface ConnectStatusResponse {
  connected: boolean;
  status: string;
  chargesEnabled: boolean;
}
export interface AdminPaymentStats {
  totalGrossRevenue: number;
  totalPlatformFees: number;
  totalTherapistPayouts: number;
  totalRefunds: number;
  paymentCount: number;
  refundCount: number;
  periodStart: string;
  periodEnd: string;
}