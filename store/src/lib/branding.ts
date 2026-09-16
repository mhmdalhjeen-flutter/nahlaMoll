/**
 * Nahla Mall — centralized brand identity and asset paths.
 * Palette derived from assets/images/logBeeIcon.png color analysis.
 */
import logBeeIcon from '../../assets/images/logBeeIcon.png';

export const BRAND = {
  nameAr: 'نحلة مول',
  nameEn: 'Nahla Mall',
  tagline: 'تسوق بسهولة والتوصيل علينا',
  pageTitle: 'نحلة مول | Nahla Mall',
  description:
    'نحلة مول — متجر إلكتروني يجمع لك ما تحتاجه في مكان واحد، مع توصيل مجاني عند إكمال 100%.',
  assistantName: 'مساعد نحلة مول',
  assistantCta: 'اسأل نحلة مول',
  sideMenuTagline: 'تسوق بسرعة وثقة',
  storeVersionLabel: 'إصدار متجر نحلة مول',
} as const;

/** Homepage messaging hierarchy — shopping platform first, free delivery as differentiator. */
export const HOME_COPY = {
  nameDisplay: 'نحلـة مول 🐝',
  shortLine: 'لكل ما يلزمك',
  positioning: 'متجر إلكتروني يجمع لك ما تحتاجه في مكان واحد',
  promise:
    'تسوّق منتجاتك المفضلة من مكان واحد، وكملها لـ100% والتوصيل علينا.',
  ctaPrimary: 'ابدأ التسوق',
  ctaSecondary: 'استكشف الأقسام',
  freeDeliveryHeadline: 'ما يميزنا هو التوصيل المجاني',
  freeDeliverySubline: 'كملها لـ 100% والتوصيل علينا',
  howItWorksTitle: 'كيف تعمل؟',
} as const;

export const HOME_HOW_IT_WORKS = [
  {
    step: '①',
    title: 'اختر ما تحتاجه',
    description: 'تصفح المنتجات والأقسام.',
  },
  {
    step: '②',
    title: 'أضف منتجاتك',
    description: 'كوّن طلبك بسهولة.',
  },
  {
    step: '③',
    title: 'كملها لـ100%',
    description: 'اقترب من هدف التوصيل المجاني.',
  },
  {
    step: '④',
    title: 'التوصيل علينا',
    description: 'عند تحقيق الشروط، تحصل على التوصيل المجاني.',
  },
] as const;

/** Measured from logBeeIcon.png (2230×1920). */
export const LOGO_META = {
  file: 'store/assets/images/logBeeIcon.png',
  width: 2230,
  height: 1920,
  aspectRatio: 2230 / 1920,
  dominantGold: '#F0B010',
  dominantNavy: '#002040',
  background: '#F0F0F0',
} as const;

/** Official small icon — logBeeIcon.png (2230×1920). */
export const LOGO_ICON_META = {
  file: 'store/assets/images/logBeeIcon.png',
  width: 2230,
  height: 1920,
  aspectRatio: 2230 / 1920,
} as const;

/** Official customer-facing assets */
export const BRAND_ASSETS = {
  logo: logBeeIcon,
  logoFull: logBeeIcon,
  icon: logBeeIcon,
  favicon: logBeeIcon.src,
} as const;
