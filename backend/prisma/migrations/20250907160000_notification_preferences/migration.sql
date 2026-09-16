-- Customer notification preference storage (delivery engine not yet implemented).
CREATE TABLE "CustomerNotificationPreferences" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "orderUpdates" BOOLEAN NOT NULL DEFAULT true,
  "freeDelivery" BOOLEAN NOT NULL DEFAULT true,
  "favorites" BOOLEAN NOT NULL DEFAULT false,
  "offers" BOOLEAN NOT NULL DEFAULT false,
  "personalRecommendations" BOOLEAN NOT NULL DEFAULT false,
  "newProducts" BOOLEAN NOT NULL DEFAULT false,
  "abuAlaaNews" BOOLEAN NOT NULL DEFAULT false,
  "pushEnabled" BOOLEAN NOT NULL DEFAULT false,
  "emailEnabled" BOOLEAN NOT NULL DEFAULT false,
  "doNotDisturbEnabled" BOOLEAN NOT NULL DEFAULT false,
  "doNotDisturbFrom" TEXT,
  "doNotDisturbUntil" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CustomerNotificationPreferences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CustomerNotificationPreferences_userId_key" ON "CustomerNotificationPreferences"("userId");
CREATE INDEX "CustomerNotificationPreferences_userId_idx" ON "CustomerNotificationPreferences"("userId");

ALTER TABLE "CustomerNotificationPreferences"
  ADD CONSTRAINT "CustomerNotificationPreferences_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
