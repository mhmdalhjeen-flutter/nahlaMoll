import type { Category } from '@/lib/types';
import { normalizeArabicForSearch } from '@/lib/help-faq-search';

/** Common Arabic shopping terms mapped to search keywords (not hardcoded category IDs). */
export const CATEGORY_ALIASES: Record<string, string[]> = {
  vegetables: ['خضار', 'خضروات', 'خضره'],
  fruits: ['فواكه', 'فاكهة', 'فاكهه'],
  electronics: ['الكترونيات', 'إلكترونيات', 'سماعات', 'سماعه', 'سماعة'],
  home: ['منزل', 'للبيت', 'البيت', 'منزلية', 'منزليه'],
  clothing: ['ملابس', 'ملابس'],
};

export interface CategoryMatch {
  category: Category;
  score: number;
  matchedVia: 'name' | 'slug' | 'description' | 'alias';
}

export function flattenCategories(categories: Category[]): Category[] {
  const out: Category[] = [];
  const walk = (nodes: Category[]) => {
    for (const node of nodes) {
      out.push(node);
      if (node.children?.length) walk(node.children);
    }
  };
  walk(categories);
  return out;
}

function tokenOverlap(query: string, target: string): number {
  const q = normalizeArabicForSearch(query);
  const t = normalizeArabicForSearch(target);
  if (!q || !t) return 0;
  if (t === q) return 100;
  if (t.includes(q) || q.includes(t)) return 80;
  const qTokens = q.split(' ').filter(Boolean);
  const tTokens = new Set(t.split(' ').filter(Boolean));
  let hits = 0;
  for (const tok of qTokens) {
    if (tTokens.has(tok)) hits += 1;
  }
  return hits > 0 ? hits * 25 : 0;
}

function aliasScore(query: string, category: Category): number {
  const q = normalizeArabicForSearch(query);
  let best = 0;
  for (const [key, aliases] of Object.entries(CATEGORY_ALIASES)) {
    const slugHit = category.slug.includes(key);
    const nameHit = normalizeArabicForSearch(category.name).includes(key);
    if (!slugHit && !nameHit) continue;
    for (const alias of aliases) {
      const a = normalizeArabicForSearch(alias);
      if (q === a || q.includes(a) || a.includes(q)) {
        best = Math.max(best, 90);
      }
    }
  }
  return best;
}

export function scoreCategoryMatch(query: string, category: Category): CategoryMatch | null {
  const scores: CategoryMatch[] = [];

  const nameScore = tokenOverlap(query, category.name);
  if (nameScore >= 50) {
    scores.push({ category, score: nameScore, matchedVia: 'name' });
  }

  const slugScore = tokenOverlap(query, category.slug.replace(/-/g, ' '));
  if (slugScore >= 50) {
    scores.push({ category, score: slugScore - 5, matchedVia: 'slug' });
  }

  if (category.description) {
    const descScore = tokenOverlap(query, category.description);
    if (descScore >= 50) {
      scores.push({ category, score: descScore - 10, matchedVia: 'description' });
    }
  }

  const alias = aliasScore(query, category);
  if (alias >= 80) {
    scores.push({ category, score: alias, matchedVia: 'alias' });
  }

  if (scores.length === 0) return null;
  return scores.sort((a, b) => b.score - a.score)[0]!;
}

export function resolveCategory(
  query: string,
  categories: Category[],
): CategoryMatch | null {
  const flat = flattenCategories(categories);
  let best: CategoryMatch | null = null;
  for (const category of flat) {
    const match = scoreCategoryMatch(query, category);
    if (!match) continue;
    if (!best || match.score > best.score) best = match;
  }
  return best && best.score >= 50 ? best : null;
}

export function resolveCategoryByKeywords(
  keywords: string[],
  categories: Category[],
): Category | null {
  for (const keyword of keywords) {
    const match = resolveCategory(keyword, categories);
    if (match) return match.category;
  }
  return null;
}

/** True when the query looks like a short category label rather than a product phrase. */
export function looksLikeCategoryQuery(query: string): boolean {
  const trimmed = query.trim();
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length > 3) return false;
  const normalized = normalizeArabicForSearch(trimmed);
  for (const aliases of Object.values(CATEGORY_ALIASES)) {
    for (const alias of aliases) {
      const a = normalizeArabicForSearch(alias);
      if (normalized === a || normalized.includes(a)) return true;
    }
  }
  return words.length <= 2;
}
