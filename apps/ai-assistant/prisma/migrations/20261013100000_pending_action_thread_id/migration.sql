-- AlterTable
ALTER TABLE "PendingAction" ADD COLUMN "threadId" TEXT;

-- CreateIndex
CREATE INDEX "PendingAction_threadId_idx" ON "PendingAction"("threadId");
