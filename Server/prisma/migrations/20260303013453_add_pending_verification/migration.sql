-- CreateTable
CREATE TABLE "PendingVerification" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "pending" JSONB NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PendingVerification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PendingVerification_email_key" ON "PendingVerification"("email");
