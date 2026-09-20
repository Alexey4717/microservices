-- CreateTable

CREATE TABLE "TelegramProfile" (
    "userId" TEXT NOT NULL,
    "telegramUserId" TEXT NOT NULL,
    "username" TEXT,
    "user_name" TEXT,
    "user_last_name" TEXT,
    "photo_url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelegramProfile_pkey" PRIMARY KEY ("userId")
);

CREATE UNIQUE INDEX "TelegramProfile_telegramUserId_key" ON "TelegramProfile"("telegramUserId");

ALTER TABLE "TelegramProfile"
  ADD CONSTRAINT "TelegramProfile_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
