-- AlterTable
ALTER TABLE "Order" ADD COLUMN "shippedAt" TIMESTAMP(3),
ADD COLUMN "deliveredAt" TIMESTAMP(3),
ADD COLUMN "cancelledAt" TIMESTAMP(3),
ADD COLUMN "cancellationReason" TEXT;

-- AlterTable
ALTER TABLE "ProductPayment" ADD COLUMN "refundRequestedAt" TIMESTAMP(3),
ADD COLUMN "refundReason" TEXT,
ADD COLUMN "refundRejectedAt" TIMESTAMP(3),
ADD COLUMN "refundRejectionReason" TEXT;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN "orderId" TEXT;

-- AlterEnum
ALTER TYPE "MessageTrigger" ADD VALUE 'ORDER_PLACED';
ALTER TYPE "MessageTrigger" ADD VALUE 'ORDER_PAID';
ALTER TYPE "MessageTrigger" ADD VALUE 'ORDER_SHIPPED';
ALTER TYPE "MessageTrigger" ADD VALUE 'ORDER_DELIVERED';
ALTER TYPE "MessageTrigger" ADD VALUE 'ORDER_CANCELLED';
ALTER TYPE "MessageTrigger" ADD VALUE 'REFUND_REQUESTED';
ALTER TYPE "MessageTrigger" ADD VALUE 'REFUND_APPROVED';
ALTER TYPE "MessageTrigger" ADD VALUE 'REFUND_REJECTED';

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
