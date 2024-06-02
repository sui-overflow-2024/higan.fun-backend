/*
  Warnings:

  - The primary key for the `Coin` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[packageId]` on the table `Coin` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Post" DROP CONSTRAINT "Post_coinId_fkey";

-- DropForeignKey
ALTER TABLE "Trade" DROP CONSTRAINT "Trade_coinId_fkey";

-- DropIndex
DROP INDEX "Coin_bondingCurveId_key";

-- AlterTable
ALTER TABLE "Coin" DROP CONSTRAINT "Coin_pkey",
ADD CONSTRAINT "Coin_pkey" PRIMARY KEY ("bondingCurveId");

-- CreateIndex
CREATE UNIQUE INDEX "Coin_packageId_key" ON "Coin"("packageId");

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_coinId_fkey" FOREIGN KEY ("coinId") REFERENCES "Coin"("bondingCurveId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_coinId_fkey" FOREIGN KEY ("coinId") REFERENCES "Coin"("bondingCurveId") ON DELETE RESTRICT ON UPDATE CASCADE;
