-- Persistent customer notifications, push subscriptions, and in-app master preference.

CREATE TYPE "NotificationEventType" AS ENUM (
  'ORDER_CONFIRMED',
  'ORDER_SHIPPED',
  'ORDER_DELIVERED',
  'ORDER_REJECTED',
  'SUPPORT_REPLY',
  'NEW_ANNOUNCEMENT'
);

CREATE TYPE "NotificationTargetType" AS ENUM (
  'ORDER',
  'PRODUCT',
  'OFFER',
  'SUPPORT',
  'ANNOUNCEMENT',
  'NONE'
);

CREATE TABLE "CustomerNotification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "eventType" "NotificationEventType" NOT NULL,
  "eventKey" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "targetType" "NotificationTargetType" NOT NULL,
  "targetId" TEXT,
  "metadata" JSONB,
  "readAt" TIMESTAMP(3),
  "inAppEligible" BOOLEAN NOT NULL DEFAULT true,
  "pushEligible" BOOLEAN NOT NULL DEFAULT false,
  "pushAttemptedAt" TIMESTAMP(3),
  "pushDeliveredAt" TIMESTAMP(3),
  "pushError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CustomerNotification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PushSubscription" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "endpoint" TEXT NOT NULL,
  "p256dh" TEXT NOT NULL,
  "auth" TEXT NOT NULL,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastUsedAt" TIMESTAMP(3),
  "invalidatedAt" TIMESTAMP(3),

  CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "CustomerNotificationPreferences"
  ADD COLUMN "inAppEnabled" BOOLEAN NOT NULL DEFAULT true;

CREATE UNIQUE INDEX "CustomerNotification_userId_eventKey_key"
  ON "CustomerNotification"("userId", "eventKey");

CREATE INDEX "CustomerNotification_userId_createdAt_idx"
  ON "CustomerNotification"("userId", "createdAt" DESC);

CREATE INDEX "CustomerNotification_userId_readAt_idx"
  ON "CustomerNotification"("userId", "readAt");

CREATE UNIQUE INDEX "PushSubscription_endpoint_key"
  ON "PushSubscription"("endpoint");

CREATE INDEX "PushSubscription_userId_idx"
  ON "PushSubscription"("userId");

ALTER TABLE "CustomerNotification"
  ADD CONSTRAINT "CustomerNotification_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PushSubscription"
  ADD CONSTRAINT "PushSubscription_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
