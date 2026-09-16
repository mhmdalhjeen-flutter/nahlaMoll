import type { ElectronicPaymentMethodKey, PublicPaymentConfig } from '@/lib/types';

export const ELECTRONIC_PAYMENT_LABELS: Record<ElectronicPaymentMethodKey, string> = {
  bankOfPalestine: 'بنك فلسطين',
  palPay: 'PalPay',
  jawwalPay: 'Jawwal Pay',
};

export type PaymentMode = 'cod' | 'electronic';

export function getEnabledElectronicMethods(
  config: PublicPaymentConfig | undefined,
): { key: ElectronicPaymentMethodKey; label: string; account: NonNullable<PublicPaymentConfig['methods'][ElectronicPaymentMethodKey]> }[] {
  if (!config) return [];
  const keys = Object.keys(ELECTRONIC_PAYMENT_LABELS) as ElectronicPaymentMethodKey[];
  return keys
    .filter((key) => config.methods[key] != null)
    .map((key) => ({
      key,
      label: ELECTRONIC_PAYMENT_LABELS[key],
      account: config.methods[key]!,
    }));
}

export function hasAnyPaymentOption(config: PublicPaymentConfig | undefined): boolean {
  if (!config) return false;
  if (config.cod.enabled) return true;
  return getEnabledElectronicMethods(config).length > 0;
}
