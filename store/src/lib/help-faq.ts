import type { PublicPaymentConfig } from './types';
import {
  ELECTRONIC_PAYMENT_LABELS,
  getEnabledElectronicMethods,
} from './payment-config';
import { FREE_DELIVERY_ELIGIBILITY_THRESHOLD } from './delivery.constants';

export type FaqCategoryId = 'free-delivery' | 'orders' | 'payment' | 'address';

export interface FaqItem {
  id: string;
  categoryId: FaqCategoryId;
  question: string;
  keywords: string[];
  /** Static answer or resolver using live payment config */
  getAnswer: (ctx: FaqAnswerContext) => string;
}

export interface FaqCategory {
  id: FaqCategoryId;
  title: string;
  emoji: string;
}

export interface FaqAnswerContext {
  paymentConfig?: PublicPaymentConfig;
}

export const FAQ_CATEGORIES: FaqCategory[] = [
  { id: 'free-delivery', title: 'التوصيل المجاني', emoji: '🚚' },
  { id: 'orders', title: 'الطلبات', emoji: '🛒' },
  { id: 'payment', title: 'الدفع', emoji: '💳' },
  { id: 'address', title: 'العنوان', emoji: '📍' },
];

const THRESHOLD = FREE_DELIVERY_ELIGIBILITY_THRESHOLD;

function paymentMethodsAnswer(ctx: FaqAnswerContext): string {
  const config = ctx.paymentConfig;
  const electronic = getEnabledElectronicMethods(config);
  const cod = config?.cod.enabled;

  if (!config || (!cod && electronic.length === 0)) {
    return 'طرق الدفع المتاحة تظهر لك أثناء تأكيد الطلب حسب الطرق المفعّلة حاليًا في المتجر. افتح صفحة الدفع لمعرفة الخيارات المتاحة لطلبك.';
  }

  const parts: string[] = ['طرق الدفع المتاحة تظهر لك أثناء تأكيد الطلب حسب الطرق المفعّلة حاليًا:'];
  if (cod) {
    parts.push('• الدفع عند التوصيل');
  }
  for (const method of electronic) {
    parts.push(`• ${method.label}`);
  }
  return parts.join('\n');
}

function walletPaymentAnswer(ctx: FaqAnswerContext): string {
  const electronic = getEnabledElectronicMethods(ctx.paymentConfig);
  if (electronic.length === 0) {
    return 'لا توجد طرق دفع إلكتروني مفعّلة حاليًا. راجع طرق الدفع المتاحة في صفحة الدفع عند إتمام الطلب.';
  }

  const labels = electronic.map((m) => m.label).join('، ');
  return [
    `عند اختيار الدفع الإلكتروني (${labels}) في صفحة الدفع:`,
    '1. اختر الطريقة المناسبة.',
    '2. أدخل اسم حساب التحويل كما يظهر في تطبيق المحفظة أو البنك.',
    '3. ارفع إثبات الدفع إذا طُلب منك ذلك.',
    '4. أكمل الطلب — ستراجع الإدارة الدفع ويتواصلون معك عند الحاجة.',
    'تفاصيل الحسابات وQR تظهر في صفحة الدفع من الإعدادات الفعلية للمتجر.',
  ].join('\n');
}

function codAnswer(ctx: FaqAnswerContext): string {
  if (ctx.paymentConfig?.cod.enabled) {
    const note = ctx.paymentConfig.cod.note?.trim();
    return note
      ? `نعم، الدفع عند الاستلام متاح حاليًا. ${note}`
      : 'نعم، يمكنك اختيار الدفع عند الاستلام أثناء تأكيد الطلب إذا ظهرت لك هذه الخيار في صفحة الدفع.';
  }
  return 'الدفع عند الاستلام غير متاح حاليًا. راجع طرق الدفع الإلكترونية المتاحة في صفحة الدفع.';
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'fd-how',
    categoryId: 'free-delivery',
    question: 'كيف أحصل على التوصيل المجاني؟',
    keywords: ['توصيل', 'مجاني', 'مجانا', '95', '100', 'مساهمة'],
    getAnswer: () =>
      [
        'التوصيل المجاني ميزة من المتجر — أنت لا تدفع «رسوم مساهمة».',
        'كل منتج في سلتك يساهم بنسبة مئوية محددة (حسب إعداد المنتج) × الكمية.',
        'تُجمع هذه النسب في شريط تقدم يصل عرضه حتى 100%.',
        `عند الوصول إلى ${THRESHOLD}% أو أكثر — مع أهلية منطقة التوصيل — تحصل على توصيل مجاني لطلبك.`,
        'يمكنك متابعة التقدم من السلة أو الصفحة الرئيسية.',
      ].join('\n'),
  },
  {
    id: 'fd-all-products',
    categoryId: 'free-delivery',
    question: 'هل كل المنتجات تساهم؟',
    keywords: ['منتج', 'مساهمة', '0', 'نسبة'],
    getAnswer: () =>
      [
        'لا. بعض المنتجات تساهم في التقدم بنسبة محددة، وبعضها قد يكون 0%.',
        'المنتجات ذات 0% تظهر: «🚚 لا يساهم في التوصيل المجاني».',
        'المنتجات المشاركة تعرض نسبة مساهمتها على بطاقة المنتج.',
      ].join('\n'),
  },
  {
    id: 'fd-remove',
    categoryId: 'free-delivery',
    question: 'ماذا يحدث عند حذف منتج؟',
    keywords: ['حذف', 'إزالة', 'سلة', 'تقدم'],
    getAnswer: () =>
      [
        'عند حذف منتج أو تقليل كميته من السلة، تُزال مساهمته من التقدم الحالي فورًا.',
        'يُعاد حساب شريط التوصيل المجاني مباشرة — دون أي رسوم على ما أزلته.',
      ].join('\n'),
  },
  {
    id: 'ord-how',
    categoryId: 'orders',
    question: 'كيف أطلب؟',
    keywords: ['طلب', 'شراء', 'سلة', 'دفع'],
    getAnswer: () =>
      [
        '1. تصفّح المنتجات وأضف ما يناسبك إلى السلة.',
        '2. حدّد منطقة التوصيل والعنوان عند الحاجة.',
        '3. راجع السلة وتأكد من المنتجات والكميات.',
        '4. انتقل إلى الدفع.',
        '5. اختر طريقة الدفع المتاحة لطلبك.',
        '6. أكّد الطلب — ستظهر لك رسالة نجاح ورقم الطلب.',
      ].join('\n'),
  },
  {
    id: 'ord-track',
    categoryId: 'orders',
    question: 'كيف أتابع طلبي؟',
    keywords: ['متابعة', 'حالة', 'طلباتي', 'تتبع'],
    getAnswer: () =>
      [
        'من «طلباتي» في التطبيق يمكنك رؤية جميع طلباتك.',
        'كل طلب يعرض حالته الحالية (قيد المراجعة، جاري التجهيز، في الطريق، تم التسليم، وغيرها).',
        'لا يتوفر تتبع GPS مباشر — الحالة تُحدَّث حسب مراحل الطلب في المتجر.',
      ].join('\n'),
  },
  {
    id: 'ord-edit',
    categoryId: 'orders',
    question: 'كيف أعدل الطلب؟',
    keywords: ['تعديل', 'تغيير', 'طلب'],
    getAnswer: () =>
      [
        'تعديل الطلب بعد إرساله غير متاح حاليًا من التطبيق.',
        'إذا احتجت مساعدة قبل بدء التجهيز، تواصل مع الدعم أو استخدم «مراجعة الطلب» للطلبات المؤهلة.',
      ].join('\n'),
  },
  {
    id: 'ord-cancel',
    categoryId: 'orders',
    question: 'كيف ألغي الطلب؟',
    keywords: ['إلغاء', 'الغاء', 'cancel'],
    getAnswer: () =>
      [
        'يمكنك إلغاء الطلب من «طلباتي» أو تفاصيل الطلب إذا كان في مرحلة تسمح بالإلغاء (مثل: قيد المراجعة أو مؤكد قبل الشحن).',
        'اضغط «إلغاء الطلب» وأكّد في نافذة التأكيد.',
        'بعد الإلغاء لن يُجهَّز الطلب أو يُوصَّل.',
        'الطلبات التي دخلت التجهيز أو الشحن لا يمكن إلغاؤها من التطبيق.',
      ].join('\n'),
  },
  {
    id: 'pay-methods',
    categoryId: 'payment',
    question: 'ما طرق الدفع؟',
    keywords: ['دفع', 'طرق', 'محفظة', 'cod'],
    getAnswer: paymentMethodsAnswer,
  },
  {
    id: 'pay-wallet',
    categoryId: 'payment',
    question: 'كيف أدفع عن طريق المحفظة؟',
    keywords: ['محفظة', 'palpay', 'jawwal', 'تحويل', 'إثبات'],
    getAnswer: walletPaymentAnswer,
  },
  {
    id: 'pay-cod',
    categoryId: 'payment',
    question: 'هل يمكن الدفع عند الاستلام؟',
    keywords: ['استلام', 'cod', 'نقد', 'كاش'],
    getAnswer: codAnswer,
  },
  {
    id: 'addr-area',
    categoryId: 'address',
    question: 'كيف أحدد منطقتي؟',
    keywords: ['منطقة', 'توصيل', 'عنوان', 'أول'],
    getAnswer: () =>
      [
        'عند إضافة أول منتج للسلة أو في صفحة الدفع، يُطلب منك اختيار منطقة التوصيل.',
        'اختر منطقتك من القائمة، ثم أدخل العنوان التفصيلي (شارع، بناية، معلم).',
        'يمكن حفظ العنوان لاستخدامه في الطلبات التالية.',
      ].join('\n'),
  },
  {
    id: 'addr-change',
    categoryId: 'address',
    question: 'كيف أغير عنوان التوصيل؟',
    keywords: ['تغيير', 'عنوان', 'تحديث'],
    getAnswer: () =>
      [
        'لتغيير العنوان قبل الطلب: من الإعدادات ← عناويني، أو أثناء الدفع في قسم عنوان التوصيل.',
        'تغيير العنوان المحفوظ لا يغيّر عنوان طلبات سابقة — كل طلب يحتفظ بعنوانه وقت الإنشاء.',
      ].join('\n'),
  },
];

export function getFaqItemsByCategory(categoryId: FaqCategoryId): FaqItem[] {
  return FAQ_ITEMS.filter((item) => item.categoryId === categoryId);
}

export function resolveFaqAnswer(item: FaqItem, ctx: FaqAnswerContext): string {
  return item.getAnswer(ctx);
}

/** Labels for enabled electronic methods (for tests/docs). */
export function listEnabledPaymentLabels(config?: PublicPaymentConfig): string[] {
  const labels = getEnabledElectronicMethods(config).map((m) => m.label);
  if (config?.cod.enabled) labels.unshift('الدفع عند التوصيل');
  return labels;
}

export { ELECTRONIC_PAYMENT_LABELS };
