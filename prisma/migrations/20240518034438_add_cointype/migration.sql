/*
  Warnings:

  - Added the required column `coinType` to the `Coin` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Coin" ("createdAt", "creator", "decimals", "description", "discordUrl", "iconUrl", "module", "name", "packageId", "storeId", "symbol", "telegramUrl", "twitterUrl", "updatedAt", "website", "whitepaperUrl") SELECT "createdAt", "creator", "decimals", "description", "discordUrl", "iconUrl", "module", "name", "packageId", "storeId", "symbol", "telegramUrl", "twitterUrl", "updatedAt", "website", "whitepaperUrl" FROM "Coin";
DROP TABLE "Coin";
ALTER TABLE "new_Coin" RENAME TO "Coin";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
