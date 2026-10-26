-- CreateTable
CREATE TABLE "Source" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "url" TEXT NOT NULL,
    "store" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" DATETIME,
    "lastError" TEXT,
    "productCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Product" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "store" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "brand" TEXT,
    "image" TEXT,
    "cpu" TEXT,
    "ramGb" INTEGER,
    "storageGb" INTEGER,
    "storageType" TEXT,
    "screenIn" REAL,
    "gpu" TEXT,
    "inStock" BOOLEAN NOT NULL DEFAULT true,
    "currentPrice" REAL NOT NULL,
    "listPrice" REAL,
    "lowestPrice" REAL NOT NULL,
    "prevPrice" REAL,
    "currency" TEXT NOT NULL DEFAULT 'CRC',
    "sourceId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Product_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PriceHistory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "productId" INTEGER NOT NULL,
    "price" REAL NOT NULL,
    "listPrice" REAL,
    "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PriceHistory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Source_url_key" ON "Source"("url");

-- CreateIndex
CREATE UNIQUE INDEX "Product_store_externalId_key" ON "Product"("store", "externalId");

-- CreateIndex
CREATE INDEX "PriceHistory_productId_capturedAt_idx" ON "PriceHistory"("productId", "capturedAt");
