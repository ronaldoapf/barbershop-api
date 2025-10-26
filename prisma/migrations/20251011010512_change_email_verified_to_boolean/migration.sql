/*
  Warnings:

  - The `is_email_verified` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "is_email_verified",
ADD COLUMN     "is_email_verified" BOOLEAN NOT NULL DEFAULT false;
