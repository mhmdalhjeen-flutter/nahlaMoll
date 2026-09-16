/** Natural shopping themes → search keywords for real store products. */
export interface ShoppingTheme {
  id: string;
  patterns: RegExp[];
  searchTerms: string[];
  categoryKeywords?: string[];
  replyIntro: string;
}

export const SHOPPING_THEMES: ShoppingTheme[] = [
  {
    id: 'breakfast',
    patterns: [/فطور/i, /الفطور/i, /افطار/i, /إفطار/i],
    searchTerms: ['بيض', 'لبن', 'جبن', 'خبز', 'زبدة', 'شاي', 'قهوة'],
    categoryKeywords: ['home'],
    replyIntro: 'أكيد 👌\nهاي أشياء ممكن تناسب الفطور:',
  },
  {
    id: 'gym',
    patterns: [/جيم/i, /رياض/i, /رياضة/i, /للجيم/i],
    searchTerms: ['سماعة', 'رياضة', 'ماء', 'بروتين'],
    categoryKeywords: ['electronics', 'clothing'],
    replyIntro: 'أكيد 💪\nهاي أشياء ممكن تناسب الجيم:',
  },
  {
    id: 'household',
    patterns: [/للبيت/i, /البيت/i, /أشياء للبيت/i, /اغراض للبيت/i, /أغراض للبيت/i],
    searchTerms: ['منزل', 'مطبخ', 'تنظيف'],
    categoryKeywords: ['home'],
    replyIntro: 'أكيد 🏠\nهاي أغراض ممكن تناسب البيت:',
  },
  {
    id: 'gathering',
    patterns: [/عزوم/i, /عزومة/i, /ضيوف/i, /لعزوم/i],
    searchTerms: ['فواكه', 'حلويات', 'مشروبات', 'وجبات'],
    replyIntro: 'أكيد 🎉\nهاي أشياء ممكن تناسب العزومة:',
  },
  {
    id: 'cooking_meal',
    patterns: [/مكونات طبخ/i, /طبخة/i, /لعيلة/i, /لعائلة/i],
    searchTerms: ['أرز', 'زيت', 'بهارات', 'خضار'],
    replyIntro: 'أكيد 🍲\nهاي مكونات أساسية ممكن تحتاجها:',
  },
];

export function matchShoppingTheme(text: string): ShoppingTheme | null {
  for (const theme of SHOPPING_THEMES) {
    if (theme.patterns.some((p) => p.test(text))) return theme;
  }
  return null;
}
