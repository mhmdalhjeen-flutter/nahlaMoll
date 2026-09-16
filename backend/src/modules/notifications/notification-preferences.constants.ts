export const NOTIFICATION_PREFERENCE_DEFAULTS = {
  orderUpdates: true,
  freeDelivery: true,
  favorites: false,
  offers: false,
  personalRecommendations: false,
  newProducts: false,
  abuAlaaNews: false,
  pushEnabled: false,
  emailEnabled: false,
  doNotDisturbEnabled: false,
  doNotDisturbFrom: "22:00",
  doNotDisturbUntil: "08:00",
} as const;

export const TIME_24H_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isValidTime24h(value: string): boolean {
  return TIME_24H_PATTERN.test(value);
}

export type NotificationPreferenceKey =
  | "orderUpdates"
  | "freeDelivery"
  | "favorites"
  | "offers"
  | "personalRecommendations"
  | "newProducts"
  | "abuAlaaNews"
  | "pushEnabled"
  | "emailEnabled"
  | "doNotDisturbEnabled"
  | "doNotDisturbFrom"
  | "doNotDisturbUntil";

export interface NotificationPreferencesResponse {
  orderUpdates: boolean;
  freeDelivery: boolean;
  favorites: boolean;
  offers: boolean;
  personalRecommendations: boolean;
  newProducts: boolean;
  abuAlaaNews: boolean;
  pushEnabled: boolean;
  emailEnabled: boolean;
  doNotDisturbEnabled: boolean;
  doNotDisturbFrom: string | null;
  doNotDisturbUntil: string | null;
  updatedAt: string;
  channels: {
    pushSupported: boolean;
    emailSupported: boolean;
    deliverySchedulingSupported: boolean;
  };
}
