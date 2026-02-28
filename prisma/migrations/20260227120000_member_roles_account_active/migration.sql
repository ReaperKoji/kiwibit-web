-- Expand UserRole enum to support granular permissions
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'editor';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'member_manager';

-- Add account activation toggle
ALTER TABLE "MemberAccount"
ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
