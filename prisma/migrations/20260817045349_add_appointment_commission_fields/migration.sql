-- AlterTable
ALTER TABLE "appointment_services" ADD COLUMN     "commission_amount" INTEGER,
ADD COLUMN     "commission_percentage_applied" DECIMAL(5,2);
