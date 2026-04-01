-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('VISIT_REQUEST_RECEIVED', 'VISIT_APPROVED', 'VISIT_DENIED', 'VISIT_CANCELLED', 'VISIT_REMINDER_24H', 'VISIT_REMINDER_1H', 'CAREPLAN_UPDATED', 'MESSAGE_RECEIVED');

-- CreateEnum
CREATE TYPE "ReminderChannel" AS ENUM ('IN_APP_ONLY', 'EMAIL', 'SMS', 'EMAIL_AND_SMS');

-- CreateEnum
CREATE TYPE "OutboundStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "meta" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisitReminderPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" "ReminderChannel" NOT NULL DEFAULT 'IN_APP_ONLY',
    "timezone" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "VisitReminderPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboundNotification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "toAddress" TEXT NOT NULL,
    "templateKey" TEXT NOT NULL,
    "payload" JSONB,
    "status" "OutboundStatus" NOT NULL DEFAULT 'PENDING',
    "sendAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutboundNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationStar" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "starredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationStar_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_isRead_idx" ON "Notification"("isRead");

-- CreateIndex
CREATE UNIQUE INDEX "VisitReminderPreference_userId_key" ON "VisitReminderPreference"("userId");

-- CreateIndex
CREATE INDEX "OutboundNotification_status_idx" ON "OutboundNotification"("status");

-- CreateIndex
CREATE INDEX "OutboundNotification_sendAt_idx" ON "OutboundNotification"("sendAt");

-- CreateIndex
CREATE INDEX "OutboundNotification_userId_idx" ON "OutboundNotification"("userId");

-- CreateIndex
CREATE INDEX "ConversationStar_userId_idx" ON "ConversationStar"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationStar_conversationId_userId_key" ON "ConversationStar"("conversationId", "userId");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitReminderPreference" ADD CONSTRAINT "VisitReminderPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboundNotification" ADD CONSTRAINT "OutboundNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationStar" ADD CONSTRAINT "ConversationStar_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationStar" ADD CONSTRAINT "ConversationStar_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
