/*
  Warnings:

  - The primary key for the `Coin` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `objectId` on the `Coin` table. All the data in the column will be lost.
  - You are about to drop the column `treasuryCapId` on the `Coin` table. All the data in the column will be lost.
  - Added the required column `module` to the `Coin` table without a default value. This is not possible if the table is not empty.
  - Added the required column `packageId` to the `Coin` table without a default value. This is not possible if the table is not empty.
  - Added the required column `storeId` to the `Coin` table without a default value. This is not possible if the table is not empty.

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
    "description" TEXT NOT NULL,
    "iconUrl" TEXT NOT NULL,
    "website" TEXT NOT NULL DEFAULT '',
    "twitterUrl" TEXT NOT NULL DEFAULT '',
    "discordUrl" TEXT NOT NULL DEFAULT '',
    "telegramUrl" TEXT NOT NULL DEFAULT '',
    "whitepaperUrl" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Coin" ("createdAt", "creator", "decimals", "description", "discordUrl", "iconUrl", "name", "symbol", "telegramUrl", "twitterUrl", "updatedAt", "website", "whitepaperUrl") SELECT "createdAt", "creator", "decimals", "description", "discordUrl", "iconUrl", "name", "symbol", "telegramUrl", "twitterUrl", "updatedAt", "website", "whitepaperUrl" FROM "Coin";
DROP TABLE "Coin";
ALTER TABLE "new_Coin" RENAME TO "Coin";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
