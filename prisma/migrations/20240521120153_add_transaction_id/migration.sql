/*
  Warnings:

  - Added the required column `transactionId` to the `Trade` table without a default value. This is not possible if the table is not empty.

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
    "transactionId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Trade_coinId_fkey" FOREIGN KEY ("coinId") REFERENCES "Coin" ("packageId") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Trade" ("account", "coinAmount", "coinId", "createdAt", "id", "isBuy", "suiAmount", "updatedAt") SELECT "account", "coinAmount", "coinId", "createdAt", "id", "isBuy", "suiAmount", "updatedAt" FROM "Trade";
DROP TABLE "Trade";
ALTER TABLE "new_Trade" RENAME TO "Trade";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
