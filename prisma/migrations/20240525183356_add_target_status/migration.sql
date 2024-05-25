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
    "likes" INTEGER NOT NULL DEFAULT 0,
    "target" INTEGER NOT NULL DEFAULT 0,
    "status" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "signature" TEXT NOT NULL DEFAULT ''
);
INSERT INTO "new_Coin" ("coinType", "createdAt", "creator", "decimals", "description", "discordUrl", "iconUrl", "likes", "module", "name", "packageId", "signature", "storeId", "symbol", "telegramUrl", "twitterUrl", "updatedAt", "website", "whitepaperUrl") SELECT "coinType", "createdAt", "creator", "decimals", "description", "discordUrl", "iconUrl", "likes", "module", "name", "packageId", "signature", "storeId", "symbol", "telegramUrl", "twitterUrl", "updatedAt", "website", "whitepaperUrl" FROM "Coin";
DROP TABLE "Coin";
ALTER TABLE "new_Coin" RENAME TO "Coin";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
