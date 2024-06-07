-- CreateTable
CREATE TABLE "Coin" (
    "id" SERIAL NOT NULL,
    "bondingCurveId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "coinMetadataId" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "creator" TEXT NOT NULL,
    "decimals" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "iconUrl" TEXT NOT NULL DEFAULT '',
    "websiteUrl" TEXT NOT NULL DEFAULT '',
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

    CONSTRAINT "Coin_pkey" PRIMARY KEY ("id")
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

-- CreateIndex
CREATE UNIQUE INDEX "Coin_bondingCurveId_key" ON "Coin"("bondingCurveId");

-- CreateIndex
CREATE UNIQUE INDEX "Coin_packageId_key" ON "Coin"("packageId");

-- CreateIndex
CREATE UNIQUE INDEX "Coin_coinMetadataId_key" ON "Coin"("coinMetadataId");

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_coinId_fkey" FOREIGN KEY ("coinId") REFERENCES "Coin"("bondingCurveId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_coinId_fkey" FOREIGN KEY ("coinId") REFERENCES "Coin"("bondingCurveId") ON DELETE RESTRICT ON UPDATE CASCADE;
