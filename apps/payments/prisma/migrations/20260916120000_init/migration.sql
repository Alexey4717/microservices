-- CreateSchema

CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Product_code_key" ON "Product"("code");

CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productCode" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "providerCheckoutId" TEXT,
    "checkoutUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Payment_userId_idx" ON "Payment"("userId");
CREATE UNIQUE INDEX "Payment_provider_providerCheckoutId_key" ON "Payment"("provider", "providerCheckoutId");

CREATE TABLE "ProcessedWebhook" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedWebhook_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProcessedWebhook_provider_eventId_key" ON "ProcessedWebhook"("provider", "eventId");

INSERT INTO "Product" ("id", "code", "name", "amountMinor", "currency", "active", "createdAt", "updatedAt")
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'PREMIUM',
  'Premium',
  999,
  'USD',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);
