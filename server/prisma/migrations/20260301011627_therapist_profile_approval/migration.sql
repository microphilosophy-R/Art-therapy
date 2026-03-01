-- CreateEnum
CREATE TYPE "ProfileStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MessageTrigger" ADD VALUE 'PROFILE_SUBMITTED';
ALTER TYPE "MessageTrigger" ADD VALUE 'PROFILE_APPROVED';
ALTER TYPE "MessageTrigger" ADD VALUE 'PROFILE_REJECTED';

-- AlterTable
ALTER TABLE "TherapistProfile" ADD COLUMN     "certificateUrl" TEXT,
ADD COLUMN     "consultEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hourlyConsultFee" DECIMAL(10,2),
ADD COLUMN     "profileStatus" "ProfileStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "submittedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "TherapistGalleryImage" (
    "id" TEXT NOT NULL,
    "therapistId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TherapistGalleryImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TherapistGalleryImage_therapistId_idx" ON "TherapistGalleryImage"("therapistId");

-- AddForeignKey
ALTER TABLE "TherapistGalleryImage" ADD CONSTRAINT "TherapistGalleryImage_therapistId_fkey" FOREIGN KEY ("therapistId") REFERENCES "TherapistProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
