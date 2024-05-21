/*
  Warnings:

  - You are about to alter the column `coinAmount` on the `Trade` table. The data in that column could be lost. The data in that column will be cast from `Int` to `BigInt`.
  - You are about to alter the column `suiAmount` on the `Trade` table. The data in that column could be lost. The data in that column will be cast from `Int` to `BigInt`.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Trade" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "suiAmount" BIGINT NOT NULL,
    "coinAmount" BIGINT NOT NULL,
    "isBuy" BOOLEAN NOT NULL,
    "account" TEXT NOT NULL,
    "coinId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Trade_coinId_fkey" FOREIGN KEY ("coinId") REFERENCES "Coin" ("packageId") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Trade" ("account", "coinAmount", "coinId", "createdAt", "id", "isBuy", "suiAmount", "transactionId", "updatedAt") SELECT "account", "coinAmount", "coinId", "createdAt", "id", "isBuy", "suiAmount", "transactionId", "updatedAt" FROM "Trade";
DROP TABLE "Trade";
ALTER TABLE "new_Trade" RENAME TO "Trade";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
