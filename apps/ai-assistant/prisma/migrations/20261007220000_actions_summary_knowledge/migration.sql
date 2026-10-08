-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN "summary" TEXT;
ALTER TABLE "Conversation" ADD COLUMN "summaryCoversMessageId" TEXT;

-- CreateEnum
CREATE TYPE "PendingActionType" AS ENUM ('checkout', 'navigate', 'update_name');

-- CreateEnum
CREATE TYPE "PendingActionStatus" AS ENUM ('pending', 'confirmed', 'rejected');

-- CreateTable
CREATE TABLE "PendingAction" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "PendingActionType" NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "PendingActionStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PendingAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TurnTrace" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "toolNames" JSONB NOT NULL,
    "chunkIds" JSONB NOT NULL,
    "pagePath" TEXT,
    "temperature" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TurnTrace_pkey" PRIMARY KEY ("id")
);

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateTable
CREATE TABLE "KnowledgeChunk" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector,

    CONSTRAINT "KnowledgeChunk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PendingAction_conversationId_createdAt_idx" ON "PendingAction"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "PendingAction_userId_status_idx" ON "PendingAction"("userId", "status");

-- CreateIndex
CREATE INDEX "TurnTrace_conversationId_createdAt_idx" ON "TurnTrace"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "KnowledgeChunk_source_idx" ON "KnowledgeChunk"("source");

-- AddForeignKey
ALTER TABLE "PendingAction" ADD CONSTRAINT "PendingAction_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TurnTrace" ADD CONSTRAINT "TurnTrace_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
