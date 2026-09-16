export interface RecipeIngredient {
  label: string;
  emoji: string;
  searchTerms: string[];
}

export interface RecipeDefinition {
  id: string;
  name: string;
  patterns: RegExp[];
  ingredients: RecipeIngredient[];
  cookingSnippet: string;
}

export const RECIPE_CATALOG: RecipeDefinition[] = [
  {
    id: 'maqluba',
    name: 'المقلوبة',
    patterns: [/مقلوب/i, /مقلوبه/i],
    cookingSnippet:
      'المقلوبة طبخة فلسطينية تقليدية من الأرز واللحم/الدجاج والخضار. إذا بدك قائمة شراء، اسأل «شو بحتاج أشتري للمقلوبة؟»',
    ingredients: [
      { label: 'باذنجان', emoji: '🍆', searchTerms: ['باذنجان', 'بادنجان'] },
      { label: 'أرز', emoji: '🍚', searchTerms: ['أرز', 'ارز'] },
      { label: 'دجاج', emoji: '🍗', searchTerms: ['دجاج'] },
      { label: 'بصل', emoji: '🧅', searchTerms: ['بصل'] },
      { label: 'بهارات', emoji: '🧂', searchTerms: ['بهار', 'بهارات', 'توابل'] },
    ],
  },
  {
    id: 'mlokhiyeh',
    name: 'الملوخية',
    patterns: [/ملوخ/i, /ملوخيه/i, /ملوخية/i],
    cookingSnippet:
      'الملوخية تُطبخ مع الدجاج أو اللحم ومرق غني. إذا بدك قائمة شراء، اسأل «بدي أغراض ملوخية».',
    ingredients: [
      { label: 'ملوخية', emoji: '🥬', searchTerms: ['ملوخ'] },
      { label: 'دجاج', emoji: '🍗', searchTerms: ['دجاج'] },
      { label: 'ثوم', emoji: '🧄', searchTerms: ['ثوم'] },
      { label: 'أرز', emoji: '🍚', searchTerms: ['أرز', 'ارز'] },
      { label: 'ليمون', emoji: '🍋', searchTerms: ['ليمون'] },
    ],
  },
  {
    id: 'musakhan',
    name: 'المسخّن',
    patterns: [/مسخ/i, /مسخن/i],
    cookingSnippet:
      'المسخّن طبق فلسطيني من الدجاج والبصل والخبز. اسأل «شو بحتاج أشتري للمسخّن؟» لقائمة شراء.',
    ingredients: [
      { label: 'دجاج', emoji: '🍗', searchTerms: ['دجاج'] },
      { label: 'بصل', emoji: '🧅', searchTerms: ['بصل'] },
      { label: 'خبز', emoji: '🍞', searchTerms: ['خبز', 'طبoon', 'طابون'] },
      { label: 'زيت زيتون', emoji: '🫒', searchTerms: ['زيت'] },
      { label: 'سماق', emoji: '🧂', searchTerms: ['سماق', 'بهار'] },
    ],
  },
];

export function matchRecipe(text: string): RecipeDefinition | null {
  for (const recipe of RECIPE_CATALOG) {
    if (recipe.patterns.some((p) => p.test(text))) return recipe;
  }
  return null;
}

export function isRecipeShoppingQuery(text: string): boolean {
  return (
    /(شو|ايش|إيش)\s*(بحتاج|لازم)\s*(أشتري|اشتري|أجيب|اجيب)/i.test(text) ||
    /(بدي|اريد|أريد)\s*(مكونات|أغراض|اغراض)/i.test(text) ||
    /(مكونات|أغراض|اغراض)\s*(طبخ|لطبخ|ملوخ)/i.test(text) ||
    /(شو\s*بحتاج\s*لعمل|شو\s*لازم\s*لعمل)/i.test(text)
  );
}

export function isCookingKnowledgeQuery(text: string): boolean {
  return (
    /(كيف\s*أطبخ|كيف\s*اعمل|طريقة\s*عمل|وصفة\s*)/i.test(text) &&
    !isRecipeShoppingQuery(text)
  );
}
