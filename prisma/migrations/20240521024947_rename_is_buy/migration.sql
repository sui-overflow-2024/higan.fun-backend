/*
  Warnings:

  - You are about to drop the column `is_buy` on the `Trade` table. All the data in the column will be lost.
  - Added the required column `isBuy` to the `Trade` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Trade" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "inputAmount" INTEGER NOT NULL,
    "outputAmount" INTEGER NOT NULL,
    "isBuy" BOOLEAN NOT NULL,
    "sender" TEXT NOT NULL,
    "coinId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Trade_coinId_fkey" FOREIGN KEY ("coinId") REFERENCES "Coin" ("packageId") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Trade" ("coinId", "createdAt", "id", "inputAmount", "outputAmount", "sender", "updatedAt") SELECT "coinId", "createdAt", "id", "inputAmount", "outputAmount", "sender", "updatedAt" FROM "Trade";
DROP TABLE "Trade";
ALTER TABLE "new_Trade" RENAME TO "Trade";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
