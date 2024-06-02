/*
  Warnings:

  - You are about to drop the column `coinType` on the `Coin` table. All the data in the column will be lost.
  - You are about to drop the column `website` on the `Coin` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Coin" DROP COLUMN "coinType",
DROP COLUMN "website",
ADD COLUMN     "websiteUrl" TEXT NOT NULL DEFAULT '';
