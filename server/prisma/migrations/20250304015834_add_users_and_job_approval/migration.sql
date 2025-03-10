/*
  Warnings:

  - Added the required column `userId` to the `Job` table without a default value. This is not possible if the table is not empty.

*/
-- Create User table
CREATE TABLE "User" (
    "id" SERIAL PRIMARY KEY,
    "email" TEXT NOT NULL UNIQUE,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Create admin user for existing jobs
INSERT INTO "User" ("email", "password", "name", "isAdmin", "updatedAt")
VALUES ('admin@jobboard.com', '$2a$10$K7L1OJ45/4Y2nIvhRVpCe.FSmhDdWoXehVzJptJ/op0lSsvqNu1tC', 'Admin', true, CURRENT_TIMESTAMP)
RETURNING id;

-- Add new columns to Job table
ALTER TABLE "Job" ADD COLUMN "isApproved" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Job" ADD COLUMN "userId" INTEGER;

-- Update existing jobs to reference admin user
UPDATE "Job" SET "userId" = (SELECT id FROM "User" WHERE email = 'admin@jobboard.com');

-- Make userId not nullable
ALTER TABLE "Job" ALTER COLUMN "userId" SET NOT NULL;

-- Add foreign key constraint
ALTER TABLE "Job" ADD CONSTRAINT "Job_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
