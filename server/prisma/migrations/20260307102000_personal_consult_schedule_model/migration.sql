-- AlterTable
ALTER TABLE "TherapyPlan"
ADD COLUMN "consultDateStart" TIMESTAMP(3),
ADD COLUMN "consultDateEnd" TIMESTAMP(3),
ADD COLUMN "consultWorkStartMin" INTEGER,
ADD COLUMN "consultWorkEndMin" INTEGER,
ADD COLUMN "consultTimezone" TEXT DEFAULT 'Asia/Shanghai';

-- Backfill existing PERSONAL_CONSULT plans from legacy start/end datetimes
UPDATE "TherapyPlan"
SET
  "consultDateStart" = (
    (to_char(("startTime" AT TIME ZONE 'Asia/Shanghai'), 'YYYY-MM-DD') || 'T00:00:00Z')::timestamptz
  ),
  "consultDateEnd" = (
    (to_char((COALESCE("endTime", "startTime") AT TIME ZONE 'Asia/Shanghai'), 'YYYY-MM-DD') || 'T00:00:00Z')::timestamptz
  ),
  "consultWorkStartMin" = (
    EXTRACT(HOUR FROM ("startTime" AT TIME ZONE 'Asia/Shanghai'))::int * 60 +
    EXTRACT(MINUTE FROM ("startTime" AT TIME ZONE 'Asia/Shanghai'))::int
  ),
  "consultWorkEndMin" = (
    EXTRACT(HOUR FROM (COALESCE("endTime", "startTime") AT TIME ZONE 'Asia/Shanghai'))::int * 60 +
    EXTRACT(MINUTE FROM (COALESCE("endTime", "startTime") AT TIME ZONE 'Asia/Shanghai'))::int
  ),
  "consultTimezone" = COALESCE("consultTimezone", 'Asia/Shanghai')
WHERE "type" = 'PERSONAL_CONSULT';

