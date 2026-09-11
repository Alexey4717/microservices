-- CreateSchema

CREATE TABLE "UserProjection" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "avatarUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProjection_pkey" PRIMARY KEY ("id")
);
