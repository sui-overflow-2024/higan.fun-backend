-- CreateTable
CREATE TABLE "Coin" (
    "packageId" TEXT NOT NULL,
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
    "target" BIGINT NOT NULL DEFAULT 0,
    "status" INTEGER NOT NULL DEFAULT 0,
    "suiReserve" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "signature" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Coin_pkey" PRIMARY KEY ("packageId")
);

-- CreateTable
CREATE TABLE "Trade" (
    "id" SERIAL NOT NULL,
    "suiAmount" BIGINT NOT NULL,
    "coinAmount" BIGINT NOT NULL,
    "isBuy" BOOLEAN NOT NULL,
    "account" TEXT NOT NULL,
    "coinId" TEXT NOT NULL,
    "coinPrice" BIGINT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" SERIAL NOT NULL,
    "coinId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL DEFAULT '',
    "text" TEXT NOT NULL,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_coinId_fkey" FOREIGN KEY ("coinId") REFERENCES "Coin"("packageId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_coinId_fkey" FOREIGN KEY ("coinId") REFERENCES "Coin"("packageId") ON DELETE RESTRICT ON UPDATE CASCADE;
