/*
  Warnings:

  - Added the required column `coinPrice` to the `Trade` table without a default value. This is not possible if the table is not empty.

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
    "coinPrice" BIGINT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Trade_coinId_fkey" FOREIGN KEY ("coinId") REFERENCES "Coin" ("packageId") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Trade" ("account", "coinAmount", "coinId", "createdAt", "id", "isBuy", "suiAmount", "transactionId", "updatedAt") SELECT "account", "coinAmount", "coinId", "createdAt", "id", "isBuy", "suiAmount", "transactionId", "updatedAt" FROM "Trade";
DROP TABLE "Trade";
ALTER TABLE "new_Trade" RENAME TO "Trade";
CREATE TABLE "new_Coin" (
    "packageId" TEXT NOT NULL PRIMARY KEY,
    "module" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "creator" TEXT NOT NULL,
    "decimals" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "iconUrl" TEXT NOT NULL DEFAULT '',
    "coinType" TEXT NOT NULL,
    "website" TEXT NOT NULL DEFAULT '',
    "twitterUrl" TEXT NOT NULL DEFAULT '',
    "discordUrl" TEXT NOT NULL DEFAULT '',
    "telegramUrl" TEXT NOT NULL DEFAULT '',
    "whitepaperUrl" TEXT NOT NULL DEFAULT '',
    "likes" INTEGER NOT NULL DEFAULT 0,
    "target" INTEGER NOT NULL DEFAULT 0,
    "status" INTEGER NOT NULL DEFAULT 0,
    "suiReserve" BIGINT NOT NULL DEFAULT 0,
    "tradingVolume" BIGINT NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "signature" TEXT NOT NULL DEFAULT ''
);
INSERT INTO "new_Coin" ("coinType", "createdAt", "creator", "decimals", "description", "discordUrl", "iconUrl", "likes", "module", "name", "packageId", "signature", "status", "storeId", "symbol", "target", "telegramUrl", "twitterUrl", "updatedAt", "website", "whitepaperUrl") SELECT "coinType", "createdAt", "creator", "decimals", "description", "discordUrl", "iconUrl", "likes", "module", "name", "packageId", "signature", "status", "storeId", "symbol", "target", "telegramUrl", "twitterUrl", "updatedAt", "website", "whitepaperUrl" FROM "Coin";
DROP TABLE "Coin";
ALTER TABLE "new_Coin" RENAME TO "Coin";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
