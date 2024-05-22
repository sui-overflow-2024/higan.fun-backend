/*
  Warnings:

  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `authorId` on the `Post` table. All the data in the column will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "User";
PRAGMA foreign_keys=on;

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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "signature" TEXT NOT NULL DEFAULT ''
);
INSERT INTO "new_Coin" ("coinType", "createdAt", "creator", "decimals", "description", "discordUrl", "iconUrl", "likes", "module", "name", "packageId", "storeId", "symbol", "telegramUrl", "twitterUrl", "updatedAt", "website", "whitepaperUrl") SELECT "coinType", "createdAt", "creator", "decimals", "description", "discordUrl", "iconUrl", "likes", "module", "name", "packageId", "storeId", "symbol", "telegramUrl", "twitterUrl", "updatedAt", "website", "whitepaperUrl" FROM "Coin";
DROP TABLE "Coin";
ALTER TABLE "new_Coin" RENAME TO "Coin";
CREATE TABLE "new_Post" (
    "id" BIGINT NOT NULL PRIMARY KEY,
    "coinId" TEXT NOT NULL,
    "suiAddress" TEXT NOT NULL DEFAULT '',
    "text" TEXT NOT NULL,
    "likes" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Post_coinId_fkey" FOREIGN KEY ("coinId") REFERENCES "Coin" ("packageId") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Post" ("coinId", "id", "likes", "text") SELECT "coinId", "id", "likes", "text" FROM "Post";
DROP TABLE "Post";
ALTER TABLE "new_Post" RENAME TO "Post";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
