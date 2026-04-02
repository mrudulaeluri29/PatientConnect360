-- Prisma schema: AgencySettings.id @default("default") — shadow DB must match for `migrate dev`.
-- Safe on PostgreSQL if default is already set.

ALTER TABLE "AgencySettings" ALTER COLUMN "id" SET DEFAULT 'default';
