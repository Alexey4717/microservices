-- CreateSchema

CREATE TABLE "File" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "File_objectKey_key" ON "File"("objectKey");
CREATE INDEX "File_ownerUserId_idx" ON "File"("ownerUserId");
