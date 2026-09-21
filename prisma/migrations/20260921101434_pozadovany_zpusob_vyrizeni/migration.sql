-- CreateEnum
CREATE TYPE "ZpusobVyrizeni" AS ENUM ('OPRAVA', 'VYMENA', 'SLEVA', 'ODSTOUPENI');

-- AlterTable
ALTER TABLE "Reklamace" ADD COLUMN     "pozadovanyZpusob" "ZpusobVyrizeni";
