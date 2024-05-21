/*
  Warnings:

  - You are about to drop the column `inputAmount` on the `Trade` table. All the data in the column will be lost.
  - You are about to drop the column `outputAmount` on the `Trade` table. All the data in the column will be lost.
  - You are about to drop the column `sender` on the `Trade` table. All the data in the column will be lost.
  - Added the required column `account` to the `Trade` table without a default value. This is not possible if the table is not empty.
  - Added the required column `coinAmount` to the `Trade` table without a default value. This is not possible if the table is not empty.
  - Added the required column `suiAmount` to the `Trade` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Trade" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "suiAmount" INTEGER NOT NULL,
    "coinAmount" INTEGER NOT NULL,
    "isBuy" BOOLEAN NOT NULL,
    "account" TEXT NOT NULL,
    "coinId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Trade_coinId_fkey" FOREIGN KEY ("coinId") REFERENCES "Coin" ("packageId") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Trade" ("coinId", "createdAt", "id", "isBuy", "updatedAt") SELECT "coinId", "createdAt", "id", "isBuy", "updatedAt" FROM "Trade";
DROP TABLE "Trade";
ALTER TABLE "new_Trade" RENAME TO "Trade";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
