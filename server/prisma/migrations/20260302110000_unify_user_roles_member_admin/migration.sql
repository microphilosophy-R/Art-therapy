-- Role normalization: ADMIN + MEMBER only
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'MEMBER';

UPDATE "User"
SET "role" = 'MEMBER'
WHERE "role"::text <> 'ADMIN';

ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Role_new') THEN
    CREATE TYPE "Role_new" AS ENUM ('ADMIN', 'MEMBER');
  END IF;
END $$;

ALTER TABLE "User"
  ALTER COLUMN "role" TYPE "Role_new"
  USING (CASE WHEN "role"::text = 'ADMIN' THEN 'ADMIN' ELSE 'MEMBER' END)::"Role_new";

DROP TYPE "Role";
ALTER TYPE "Role_new" RENAME TO "Role";

ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'MEMBER';
