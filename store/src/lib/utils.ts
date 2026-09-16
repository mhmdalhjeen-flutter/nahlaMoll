import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(num)) return '0';
  return num.toFixed(2);
}

export function formatPhoneIndicator(phone: string): 'green' | 'red' | null {
  if (phone.startsWith('059')) return 'green';
  if (phone.startsWith('056')) return 'red';
  return null;
}

export function getErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const resp = (error as { response?: { data?: { message?: string | string[] } } }).response;
    const msg = resp?.data?.message;
    if (Array.isArray(msg)) return msg.join('، ');
    if (typeof msg === 'string') return translateError(msg);
  }
  if (error instanceof Error) return translateError(error.message);
  return 'حدث خطأ غير متوقع';
}

function translateError(msg: string): string {
  const map: Record<string, string> = {
    'Cart is empty': 'السلة فارغة',
    'Store is currently closed': 'المتجر مغلق حالياً',
    'Insufficient stock': 'الكمية غير متوفرة',
    'Unauthorized access': 'يرجى تسجيل الدخول',
    'Invalid or expired OTP': 'رمز التحقق غير صحيح أو منتهي',
    'Please wait before requesting another OTP': 'يرجى الانتظار قبل طلب رمز جديد',
  };
  for (const [key, ar] of Object.entries(map)) {
    if (msg.includes(key)) return ar;
  }
  if (msg.includes('Insufficient stock')) return 'الكمية المطلوبة غير متوفرة';
  return msg;
}

export function isDeliveryAreaNotFound(error: unknown): boolean {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const resp = (error as { response?: { status?: number; data?: { message?: string | string[] } } })
      .response;
    if (resp?.status !== 404) return false;
    const msg = resp.data?.message;
    const text = Array.isArray(msg) ? msg.join(' ') : typeof msg === 'string' ? msg : '';
    return /delivery area/i.test(text);
  }
  return false;
}

export function isStoreClosedError(error: unknown): boolean {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const resp = (error as { response?: { status?: number; data?: { message?: string | string[] } } })
      .response;
    if (resp?.status === 503) return true;
    const msg = resp?.data?.message;
    const text = Array.isArray(msg) ? msg.join(' ') : typeof msg === 'string' ? msg : '';
    return /store is currently closed|المتجر مغلق/i.test(text);
  }
  return false;
}

export const ORDER_STATUS_AR: Record<string, string> = {
  PENDING: 'قيد الانتظار',
  PAYMENT_SUBMITTED: 'تم إرسال الدفع',
  PAYMENT_VERIFIED: 'تم التحقق من الدفع',
  PAYMENT_REJECTED: 'تم رفض الدفع',
  CONFIRMED: 'مؤكد',
  PROCESSING: 'قيد التجهيز',
  SHIPPED: 'تم الشحن',
  DELIVERED: 'تم التسليم',
  CANCELLED: 'ملغي',
};

export const PAYMENT_STATUS_AR: Record<string, string> = {
  PENDING: 'بانتظار الدفع',
  SUBMITTED: 'تم إرسال معلومات الدفع',
  VERIFIED: 'تم التحقق',
  REJECTED: 'مرفوض',
};

export function availabilityLabel(availability: string): string {
  switch (availability) {
    case 'LIMITED':
      return 'كمية محدودة';
    case 'UNLIMITED':
      return 'متوفر';
    case 'UNAVAILABLE':
      return 'غير متاح';
    default:
      return availability;
  }
}
