/** Arabic shopping intent prefixes stripped before matching (deterministic). */
export const SEARCH_INTENT_PREFIXES: RegExp[] = [
  /^بدي\s+/,
  /^بدّي\s+/,
  /^بده\s+/,
  /^بدها\s+/,
  /^اريد\s+/,
  /^أريد\s+/,
  /^عايز\s+/,
  /^عاوز\s+/,
  /^بدنا\s+/,
  /^شو\s+/,
  /^شي\s+/,
  /^شيء\s+/,
  /^في\s+/,
  /^فيه\s+/,
  /^لـ?\s+/,
];

/** Category alias groups keyed by slug fragment — matched against real catalog categories. */
export const CATEGORY_ALIAS_TERMS: Record<string, string[]> = {
  fruits: ["فواكه", "فاكهة", "فاكهه", "فواكه"],
  vegetables: ["خضار", "خضروات", "خضره", "خضراوات"],
  electronics: ["الكترونيات", "إلكترونيات", "الكترونيه"],
  clothing: ["ملابس", "ملابس", "أزياء", "ازياء"],
  home: ["منزل", "منزلية", "منزليه", "للبيت", "البيت", "منزل"],
  sports: ["رياضة", "رياضه", "رياضي", "رياضية", "رياضيه"],
};

/**
 * Product/tag synonym groups — expand queries to catalog keywords/tags.
 * Only used for matching; never invent products.
 */
export const PRODUCT_SYNONYM_GROUPS: Array<{
  id: string;
  terms: string[];
  tags: string[];
  keywords: string[];
}> = [
  {
    id: "chargers",
    terms: [
      "شاحن",
      "شاحنه",
      "شحنة",
      "شحن",
      "اشحن",
      "اشحن فيه",
      "شحن التلفون",
      "شاحن تلفون",
      "شاحن موبايل",
      "شاحن جوال",
      "كابل شحن",
    ],
    tags: ["شاحن", "charger", "كابل"],
    keywords: ["شاحن", "charger", "usb", "كابل", "شحن"],
  },
  {
    id: "headphones",
    terms: [
      "سماعات",
      "سماعه",
      "سماعة",
      "سماعات رياضية",
      "سماعات رياضيه",
      "سماعات بلوتوث",
      "earbuds",
      "headphones",
    ],
    tags: ["سماعات", "headphones", "bluetooth", "رياضية"],
    keywords: ["سماع", "headphone", "earbud", "bluetooth", "رياض"],
  },
  {
    id: "phones",
    terms: ["تلفون", "موبايل", "جوال", "هاتف", "آيفون", "ايفون"],
    tags: ["موبايل", "phone", "جوال"],
    keywords: ["phone", "mobile", "smartphone", "iphone"],
  },
  {
    id: "fitness",
    terms: ["رياضة", "رياضه", "لياقة", "لياقه", "تمارين", "جيم", "gym"],
    tags: ["رياضة", "fitness", "رياضي"],
    keywords: ["fitness", "sport", "gym", "workout"],
  },
];

export const SEARCH_SCORE_WEIGHTS = {
  exactName: 100,
  nameStartsWith: 80,
  nameContains: 55,
  nameEnExact: 70,
  nameEnContains: 45,
  descriptionMatch: 25,
  tagExact: 40,
  tagPartial: 22,
  categoryIntent: 35,
  categoryNameMatch: 30,
  synonymKeyword: 28,
  intelligenceCategoryMax: 18,
  intelligenceTagMax: 14,
  intelligenceSearchMax: 12,
  popularityMax: 8,
  ratingMax: 6,
  activeOffer: 3,
  adminRecommended: 4,
  inStockBoost: 5,
  unavailablePenalty: -500,
  minRelevanceScore: 8,
  fallbackMinScore: 4,
} as const;

export const SEARCH_FETCH_BUFFER = 120;
export const DEFAULT_SEARCH_LIMIT = 24;
export const MAX_SEARCH_LIMIT = 60;
export const MAX_SUGGESTIONS = 8;
