-- CreateEnum
CREATE TYPE "AddressTag" AS ENUM ('HOME', 'COMPANY', 'SCHOOL', 'PARENTS', 'OTHER');

-- AlterTable
ALTER TABLE "Order"
ADD COLUMN "memberAddressId" TEXT,
ADD COLUMN "postalCode" TEXT,
ADD COLUMN "addressTag" "AddressTag";

-- CreateTable
CREATE TABLE "MemberAddress" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "recipientName" TEXT NOT NULL,
  "mobile" TEXT NOT NULL,
  "province" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "district" TEXT NOT NULL,
  "addressDetail" TEXT NOT NULL,
  "postalCode" TEXT,
  "tag" "AddressTag" NOT NULL DEFAULT 'HOME',
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MemberAddress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Order_memberAddressId_idx" ON "Order"("memberAddressId");

-- CreateIndex
CREATE INDEX "MemberAddress_userId_isDefault_idx" ON "MemberAddress"("userId", "isDefault");

-- CreateIndex
CREATE INDEX "MemberAddress_userId_createdAt_idx" ON "MemberAddress"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "Order"
ADD CONSTRAINT "Order_memberAddressId_fkey"
FOREIGN KEY ("memberAddressId") REFERENCES "MemberAddress"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberAddress"
ADD CONSTRAINT "MemberAddress_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
