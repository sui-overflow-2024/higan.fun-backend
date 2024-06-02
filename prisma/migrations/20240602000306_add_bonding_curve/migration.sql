/*
  Warnings:

  - You are about to drop the column `storeId` on the `Coin` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[bondingCurveId]` on the table `Coin` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `bondingCurveId` to the `Coin` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Coin" DROP COLUMN "storeId",
ADD COLUMN     "bondingCurveId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Coin_bondingCurveId_key" ON "Coin"("bondingCurveId");
