-- AlterEnum
ALTER TYPE "MessageTrigger" ADD VALUE IF NOT EXISTS 'CHAT';

-- AlterTable: TherapyPlan bilingual fields
ALTER TABLE "TherapyPlan"
  ADD COLUMN "titleI18n" JSONB,
  ADD COLUMN "sloganI18n" JSONB,
  ADD COLUMN "introductionI18n" JSONB;

-- AlterTable: Product bilingual fields
ALTER TABLE "Product"
  ADD COLUMN "titleI18n" JSONB,
  ADD COLUMN "descriptionI18n" JSONB;

-- AlterTable: Message conversation linkage
ALTER TABLE "Message"
  ADD COLUMN "conversationId" TEXT;

-- CreateTable: UserFollow
CREATE TABLE "UserFollow" (
  "id" TEXT NOT NULL,
  "followerId" TEXT NOT NULL,
  "followingId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserFollow_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Conversation
CREATE TABLE "Conversation" (
  "id" TEXT NOT NULL,
  "userAId" TEXT NOT NULL,
  "userBId" TEXT NOT NULL,
  "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Conversation_distinct_users" CHECK ("userAId" <> "userBId")
);

-- Indexes
CREATE UNIQUE INDEX "UserFollow_followerId_followingId_key" ON "UserFollow"("followerId", "followingId");
CREATE INDEX "UserFollow_followerId_idx" ON "UserFollow"("followerId");
CREATE INDEX "UserFollow_followingId_idx" ON "UserFollow"("followingId");

CREATE UNIQUE INDEX "Conversation_userAId_userBId_key" ON "Conversation"("userAId", "userBId");
CREATE INDEX "Conversation_userAId_idx" ON "Conversation"("userAId");
CREATE INDEX "Conversation_userBId_idx" ON "Conversation"("userBId");
CREATE INDEX "Conversation_lastMessageAt_idx" ON "Conversation"("lastMessageAt");

CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

-- Foreign keys
ALTER TABLE "UserFollow"
  ADD CONSTRAINT "UserFollow_followerId_fkey"
  FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserFollow"
  ADD CONSTRAINT "UserFollow_followingId_fkey"
  FOREIGN KEY ("followingId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Conversation"
  ADD CONSTRAINT "Conversation_userAId_fkey"
  FOREIGN KEY ("userAId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Conversation"
  ADD CONSTRAINT "Conversation_userBId_fkey"
  FOREIGN KEY ("userBId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Message"
  ADD CONSTRAINT "Message_conversationId_fkey"
  FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill bilingual data from legacy fields
UPDATE "TherapyPlan"
SET
  "titleI18n" = jsonb_build_object('zh', "title", 'en', "title"),
  "sloganI18n" = CASE
    WHEN "slogan" IS NULL THEN NULL
    ELSE jsonb_build_object('zh', "slogan", 'en', "slogan")
  END,
  "introductionI18n" = jsonb_build_object('zh', "introduction", 'en', "introduction")
WHERE "titleI18n" IS NULL OR "introductionI18n" IS NULL;

UPDATE "Product"
SET
  "titleI18n" = jsonb_build_object('zh', "title", 'en', "title"),
  "descriptionI18n" = jsonb_build_object('zh', "description", 'en', "description")
WHERE "titleI18n" IS NULL OR "descriptionI18n" IS NULL;
