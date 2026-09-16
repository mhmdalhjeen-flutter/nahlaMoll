import type { Category, Order, PaginatedProducts, Product } from '@/lib/types';
import { filterFaqItems } from '@/lib/help-faq-search';
import { resolveFaqAnswer } from '@/lib/help-faq';
import { FREE_DELIVERY_ELIGIBILITY_THRESHOLD } from '@/lib/delivery.constants';
import { formatCustomerOrderNumber } from '@/lib/order-number';
import { getCustomerOrderStatus } from '@/lib/customer-order-ui';
import {
  buildBasketSuggestions,
  type BasketCriteria,
  type BasketSuggestion,
} from './basket-builder';
import {
  resolveCategory,
  resolveCategoryByKeywords,
} from './category-resolver';
import { resolveIntent } from './intent-resolver';
import {
  emojiForProductName,
  filterPurchasableProducts,
  uniqueProductsById,
} from './product-utils';
import { matchRecipe, RECIPE_CATALOG, type RecipeDefinition } from './recipe-catalog';
import { matchShoppingTheme, SHOPPING_THEMES } from './shopping-themes';
import {
  BASKET_SUGGESTIONS,
  CATEGORY_SUGGESTIONS,
  getSuggestionsForContext,
  PRODUCT_DETAIL_SUGGESTIONS,
  WELCOME_SUGGESTIONS,
} from './suggestions';
import type {
  AssistantCompactItem,
  AssistantEngineContext,
  AssistantEngineDeps,
  AssistantSessionState,
  AssistantTurn,
} from './types';

const STORE_TAIL =
  'وإذا بدك، بقدر أساعدك بأي شيء متعلق بالمتجر أو المنتجات.';

function unknownReply(): AssistantTurn {
  return {
    reply:
      'ما عندي معلومات كافية عن هالموضوع، وما بدي أعطيك جواب غير دقيق.',
    suggestions: getSuggestionsForContext('unknown'),
    showSupport: true,
    supportLabel: '👨‍💻 تواصل مع محمد',
    suggestionContext: 'unknown',
  };
}

function supportReply(): AssistantTurn {
  return {
    reply:
      'هاي المشكلة بدها مساعدة من شخص مختص حتى نقدر نساعدك بشكل صحيح.',
    suggestions: [{ id: 'contact_support', label: '👨‍💻 تواصل مع محمد' }],
    showSupport: true,
    supportLabel: '👨‍💻 تواصل مع محمد',
    suggestionContext: 'unknown',
  };
}

async function productsFromDiscovery(
  deps: AssistantEngineDeps,
  ctx: AssistantEngineContext,
  sectionType: string,
  categoryId?: string,
) {
  const feed = await deps.getDiscoveryFeed({
    cartProductIds: ctx.cartProductIds,
    displayProgress: ctx.displayProgress,
    remainingScore: ctx.remainingScore,
    categoryId,
    limit: 8,
  });
  const section = feed.sections.find((s) => s.sectionType === sectionType);
  return section?.products ?? feed.sections[0]?.products ?? [];
}

async function loadCategories(deps: AssistantEngineDeps): Promise<Category[]> {
  if (!deps.getCategories) return [];
  return deps.getCategories();
}

async function loadCategoryProducts(
  deps: AssistantEngineDeps,
  categoryId: string,
  limit = 40,
): Promise<Product[]> {
  if (!deps.getProducts) return [];
  const page: PaginatedProducts = await deps.getProducts({ categoryId, limit, page: 1 });
  return page.products ?? [];
}

function toCompactItems(products: Product[], max = 8): AssistantCompactItem[] {
  return filterPurchasableProducts(products)
    .slice(0, max)
    .map((p) => ({
      productId: p.id,
      label: p.name,
      emoji: emojiForProductName(p.name),
    }));
}

async function gatherProductsForTheme(
  deps: AssistantEngineDeps,
  themeId: string,
  categories: Category[],
): Promise<Product[]> {
  const theme = SHOPPING_THEMES.find((t) => t.id === themeId);
  if (!theme) return [];

  const found: Product[] = [];
  for (const term of theme.searchTerms) {
    const results = await deps.searchProducts(term);
    found.push(...results);
  }

  if (theme.categoryKeywords?.length && deps.getProducts) {
    const cat = resolveCategoryByKeywords(theme.categoryKeywords, categories);
    if (cat) {
      found.push(...(await loadCategoryProducts(deps, cat.id)));
    }
  }

  return uniqueProductsById(filterPurchasableProducts(found));
}

async function handleCategorySearch(
  query: string,
  deps: AssistantEngineDeps,
  ctx: AssistantEngineContext,
): Promise<AssistantTurn> {
  const categories = await loadCategories(deps);
  const match = resolveCategory(query, categories);

  if (match && deps.getProducts) {
    const products = await loadCategoryProducts(deps, match.category.id);
    const compact = toCompactItems(products);
    if (compact.length > 0) {
      return {
        reply: `👋 أكيد، هاي الأشياء الموجودة عندنا من قسم ${match.category.name}:`,
        compactItems: compact,
        categoryId: match.category.id,
        categoryName: match.category.name,
        suggestions: CATEGORY_SUGGESTIONS,
        suggestionContext: 'category',
        sessionPatch: {
          lastCategoryId: match.category.id,
          lastSearchTerm: query,
          lastIntent: 'category_search',
        },
      };
    }
  }

  const products = filterPurchasableProducts(await deps.searchProducts(query));
  if (products.length > 0) {
    const compact = toCompactItems(products);
    return {
      reply: compact.length >= 3 ? 'هاي منتجات ممكن تناسب طلبك — اختر واحد:' : 'هاي منتجات ممكن تناسب طلبك:',
      compactItems: compact.length >= 2 ? compact : undefined,
      products: compact.length < 2 ? products.slice(0, 6) : undefined,
      suggestions: getSuggestionsForContext('products'),
      suggestionContext: 'products',
      sessionPatch: { lastSearchTerm: query, lastIntent: 'category_search' },
    };
  }

  return {
    reply: 'ما لقيت منتجات أو أقسام مطابقة — جرّب كلمات ثانية.',
    suggestions: WELCOME_SUGGESTIONS,
    suggestionContext: 'unknown',
  };
}

async function handleNaturalShopping(
  parsed: ReturnType<typeof resolveIntent>,
  deps: AssistantEngineDeps,
): Promise<AssistantTurn> {
  const theme = SHOPPING_THEMES.find((t) => t.id === parsed.themeId);
  if (!theme) return unknownReply();

  const categories = await loadCategories(deps);
  const products = await gatherProductsForTheme(deps, theme.id, categories);
  const compact = toCompactItems(products);

  return {
    reply: theme.replyIntro,
    compactItems: compact.length >= 2 ? compact : undefined,
    products: compact.length < 2 ? products.slice(0, 6) : undefined,
    suggestions: getSuggestionsForContext('products'),
    suggestionContext: 'products',
    sessionPatch: { lastSearchTerm: theme.id, lastIntent: 'natural_shopping' },
  };
}

async function mapRecipeIngredients(
  recipe: RecipeDefinition,
  deps: AssistantEngineDeps,
): Promise<{ compact: AssistantCompactItem[]; matchedCount: number }> {
  const compact: AssistantCompactItem[] = [];
  let matchedCount = 0;

  for (const ing of recipe.ingredients) {
    let product: Product | undefined;
    for (const term of ing.searchTerms) {
      const results = filterPurchasableProducts(await deps.searchProducts(term));
      if (results[0]) {
        product = results[0];
        break;
      }
    }
    if (product) {
      matchedCount += 1;
      compact.push({
        productId: product.id,
        label: ing.label,
        emoji: ing.emoji,
        mappedProductName: product.name,
      });
    } else {
      compact.push({
        productId: '',
        label: ing.label,
        emoji: ing.emoji,
        unavailable: true,
      });
    }
  }

  return { compact, matchedCount };
}

async function handleRecipeShopping(
  parsed: ReturnType<typeof resolveIntent>,
  deps: AssistantEngineDeps,
): Promise<AssistantTurn> {
  const recipe =
    RECIPE_CATALOG.find((r) => r.id === parsed.recipeId) ??
    matchRecipe(parsed.context ?? '');
  if (!recipe) {
    return {
      reply: 'ما عندي معلومات كافية عن مكونات هاي الطبخة داخل المتجر حتى أعطيك قائمة دقيقة.',
      suggestions: WELCOME_SUGGESTIONS,
      suggestionContext: 'unknown',
    };
  }

  const { compact, matchedCount } = await mapRecipeIngredients(recipe, deps);
  const minRequired = Math.ceil(recipe.ingredients.length * 0.4);

  if (matchedCount < minRequired) {
    return {
      reply: 'ما عندي معلومات كافية عن مكونات هاي الطبخة داخل المتجر حتى أعطيك قائمة دقيقة.',
      suggestions: WELCOME_SUGGESTIONS,
      suggestionContext: 'unknown',
    };
  }

  return {
    reply: `🍲 مكونات مقترحة ل${recipe.name}:\n\nاختر مكونًا لعرض المنتج:`,
    compactItems: compact.filter((c) => !c.unavailable),
    suggestions: [
      { id: 'build_basket_from_recipe', label: '🛒 كوّنلي سلة' },
      ...CATEGORY_SUGGESTIONS.slice(0, 2),
    ],
    suggestionContext: 'recipe',
    sessionPatch: { lastIntent: 'recipe_shopping', lastSearchTerm: recipe.id },
  };
}

async function handleBasketBuilder(
  parsed: ReturnType<typeof resolveIntent>,
  deps: AssistantEngineDeps,
  ctx: AssistantEngineContext,
): Promise<AssistantTurn> {
  const budget = parsed.budget ?? 100;
  const categories = await loadCategories(deps);
  let products: Product[] = [];

  if (parsed.categoryKeywords?.length) {
    const cat = resolveCategoryByKeywords(parsed.categoryKeywords, categories);
    if (cat && deps.getProducts) {
      products = await loadCategoryProducts(deps, cat.id, 60);
    }
    if (products.length === 0) {
      for (const kw of parsed.categoryKeywords) {
        products.push(...(await deps.searchProducts(kw)));
      }
    }
  }

  if (products.length === 0) {
    const feed = await productsFromDiscovery(deps, ctx, 'most_ordered');
    products = feed;
  }

  products = filterPurchasableProducts(uniqueProductsById(products));

  const criteria: BasketCriteria = {
    budget,
    goal: parsed.basketGoal ?? 'variety',
    categoryKeywords: parsed.categoryKeywords,
  };

  const baskets = buildBasketSuggestions(products, criteria, {
    remainingScore: ctx.remainingScore,
    displayProgress: ctx.displayProgress,
  });

  if (baskets.length === 0) {
    return {
      reply: 'ما لقيت منتجات كافية لبناء سلة ضمن ميزانيتك حاليًا.',
      suggestions: WELCOME_SUGGESTIONS,
      suggestionContext: 'unknown',
    };
  }

  return {
    reply: `🧺 هاي ${baskets.length} اقتراحات سلة ضمن ${budget} ₪:`,
    baskets,
    basketCriteria: criteria,
    suggestions: BASKET_SUGGESTIONS,
    suggestionContext: 'basket',
    sessionPatch: {
      lastBasketCriteria: criteria,
      lastIntent: 'basket_builder',
    },
  };
}

async function handleProductSearch(
  term: string,
  deps: AssistantEngineDeps,
  ctx: AssistantEngineContext,
): Promise<AssistantTurn> {
  const categories = await loadCategories(deps);
  const catMatch = resolveCategory(term, categories);

  if (catMatch && catMatch.score >= 70 && deps.getProducts) {
    return handleCategorySearch(term, deps, ctx);
  }

  const products = filterPurchasableProducts(await deps.searchProducts(term));
  const compact = toCompactItems(products);

  return {
    reply:
      products.length > 0
        ? compact.length >= 3
          ? 'هاي منتجات ممكن تناسب طلبك — اختر واحد:'
          : 'هاي منتجات ممكن تناسب طلبك:'
        : 'ما لقيت منتجات مطابقة — جرّب كلمات ثانية أو اسألني عن فئة مختلفة.',
    compactItems: compact.length >= 3 ? compact : undefined,
    products: compact.length < 3 ? products.slice(0, 6) : undefined,
    suggestions: getSuggestionsForContext('products'),
    suggestionContext: 'products',
    sessionPatch: { lastSearchTerm: term, lastIntent: 'product_search' },
  };
}

export async function runProductSelection(
  productId: string,
  deps: AssistantEngineDeps,
  ctx: AssistantEngineContext,
): Promise<AssistantTurn> {
  let product: Product | undefined;
  if (deps.getProduct) {
    product = await deps.getProduct(productId);
  }

  if (!product) {
    return {
      reply: 'ما لقيت المنتج — ممكن يكون غير متوفر حاليًا.',
      suggestions: WELCOME_SUGGESTIONS,
      suggestionContext: 'unknown',
    };
  }

  const similar = filterPurchasableProducts(
    await productsFromDiscovery(deps, ctx, 'personalized', product.categoryId),
  )
    .filter((p) => p.id !== product!.id)
    .slice(0, 4);

  return {
    reply: `هاي تفاصيل ${product.name}:`,
    focusProduct: product,
    products: similar.length > 0 ? similar : undefined,
    similarSectionTitle: similar.length > 0 ? 'ممكن يعجبك كمان' : undefined,
    suggestions: PRODUCT_DETAIL_SUGGESTIONS,
    suggestionContext: 'product_detail',
    sessionPatch: { lastProductId: product.id, lastIntent: 'product_detail' },
  };
}

export async function runAssistantMessage(
  text: string,
  deps: AssistantEngineDeps,
  ctx: AssistantEngineContext,
  _session?: AssistantSessionState,
): Promise<AssistantTurn> {
  const parsed = resolveIntent(text);

  switch (parsed.intent) {
    case 'support':
      return supportReply();
    case 'order_status':
      return handleOrderStatus(deps, ctx);
    case 'free_delivery':
      return handleFreeDelivery(deps, ctx);
    case 'popular':
      return handlePopular(deps, ctx);
    case 'gift': {
      const term = parsed.searchTerm && parsed.searchTerm.length >= 2 ? parsed.searchTerm : 'هدية';
      const products = filterPurchasableProducts(await deps.searchProducts(term));
      return {
        reply:
          products.length > 0
            ? '🎁 هاي بعض الخيارات اللي ممكن تناسبك:'
            : 'ما لقيت منتجات محددة للهدية — جرّب تكتب نوع المنتج اللي بدك إياه.',
        products: products.slice(0, 6),
        suggestions: getSuggestionsForContext('products'),
        suggestionContext: 'products',
      };
    }
    case 'trivia':
      return {
        reply: `${parsed.context} 😊\n\n${STORE_TAIL}`,
        suggestions: WELCOME_SUGGESTIONS,
        suggestionContext: 'welcome',
      };
    case 'faq': {
      const { results } = filterFaqItems(parsed.faqQuery ?? text, {});
      const first = results.flatMap((r) => r.items)[0];
      if (!first) return unknownReply();
      return {
        reply: resolveFaqAnswer(first, {}),
        suggestions: WELCOME_SUGGESTIONS,
        suggestionContext: 'welcome',
      };
    }
    case 'cooking_general': {
      const recipe = RECIPE_CATALOG.find((r) => r.id === parsed.recipeId);
      return {
        reply: recipe
          ? `${recipe.cookingSnippet}\n\n${STORE_TAIL}`
          : `ما عندي وصفة مطولة هون — ${STORE_TAIL}`,
        suggestions: WELCOME_SUGGESTIONS,
        suggestionContext: 'welcome',
      };
    }
    case 'basket_builder':
      return handleBasketBuilder(parsed, deps, ctx);
    case 'recipe_shopping':
      return handleRecipeShopping(parsed, deps);
    case 'natural_shopping':
      return handleNaturalShopping(parsed, deps);
    case 'category_search':
      return handleCategorySearch(parsed.searchTerm ?? text.trim(), deps, ctx);
    case 'product_search': {
      const term = parsed.searchTerm ?? text.trim();
      if (term.length < 2) {
        return {
          reply: 'اكتب كلمة أو جملة أوضح عن المنتج اللي بدك إياه.',
          suggestions: WELCOME_SUGGESTIONS,
          suggestionContext: 'welcome',
        };
      }
      return handleProductSearch(term, deps, ctx);
    }
    default:
      return unknownReply();
  }
}

async function handlePopular(
  deps: AssistantEngineDeps,
  ctx: AssistantEngineContext,
): Promise<AssistantTurn> {
  const products = filterPurchasableProducts(
    await productsFromDiscovery(deps, ctx, 'most_ordered'),
  );
  return {
    reply: products.length
      ? '🔥 هاي أكثر المنتجات طلبًا حاليًا:'
      : 'ما في منتجات كافية لعرض الأكثر طلبًا حاليًا.',
    products: products.slice(0, 6),
    suggestions: getSuggestionsForContext('products'),
    suggestionContext: 'products',
  };
}

async function handleFreeDelivery(
  deps: AssistantEngineDeps,
  ctx: AssistantEngineContext,
): Promise<AssistantTurn> {
  const pct = Math.round(ctx.displayProgress ?? 0);
  const remaining = Math.max(0, 100 - pct);

  let reply =
    `التوصيل المجاني يتحقق عندما تصل نسبة التقدّم إلى ${FREE_DELIVERY_ELIGIBILITY_THRESHOLD}% أو أكثر في منطقة توصيل مؤهلة.\n\n`;

  if (pct > 0 && pct < FREE_DELIVERY_ELIGIBILITY_THRESHOLD) {
    reply += `باقي لك ${remaining}% 👌\n`;
    const products = filterPurchasableProducts(
      await productsFromDiscovery(deps, ctx, 'free_delivery_boost'),
    );
    if (products.length > 0) {
      reply += 'هاي منتجات ممكن تناسبك وتساعدك تكمل التوصيل المجاني:';
      return {
        reply,
        products: products.slice(0, 6),
        suggestions: getSuggestionsForContext('free_delivery'),
        suggestionContext: 'free_delivery',
      };
    }
  } else if (pct >= FREE_DELIVERY_ELIGIBILITY_THRESHOLD) {
    reply += '👌 أنت قريب أو مؤهل للتوصيل المجاني حسب سلتك ومنطقة التوصيل.';
  } else {
    reply += 'ابدأ بإضافة منتجات للسلة واختر منطقة توصيل مؤهلة لمعرفة تقدّمك.';
  }

  return {
    reply,
    suggestions: getSuggestionsForContext('free_delivery'),
    suggestionContext: 'free_delivery',
  };
}

async function handleOrderStatus(
  deps: AssistantEngineDeps,
  ctx: AssistantEngineContext,
): Promise<AssistantTurn> {
  if (!ctx.isAuthenticated || !deps.getOrders) {
    return {
      reply: 'لمعرفة حالة طلبك، سجّل دخولك ثم اسألني مرة ثانية عن «وين طلبي؟»',
      suggestions: WELCOME_SUGGESTIONS,
      suggestionContext: 'welcome',
    };
  }

  const orders = await deps.getOrders();
  const active = pickLatestActiveOrder(orders);
  if (!active) {
    return {
      reply: 'ما لقيت طلبات نشطة حاليًا. يمكنك مراجعة طلباتك السابقة من صفحة الطلبات.',
      suggestions: WELCOME_SUGGESTIONS,
      suggestionContext: 'welcome',
    };
  }

  const status = getCustomerOrderStatus(active);
  return {
    reply: `📦 طلبك ${formatCustomerOrderNumber(active.orderNumber)}\n\n🚚 ${status.label}.\n${status.helper}`,
    order: {
      orderId: active.id,
      orderNumber: active.orderNumber,
      statusLabel: status.label,
      helper: status.helper,
    },
    suggestions: getSuggestionsForContext('order'),
    suggestionContext: 'order',
  };
}

function pickLatestActiveOrder(orders: Order[]): Order | undefined {
  const waiting = orders.filter(
    (o) => o.status !== 'DELIVERED' && o.status !== 'CANCELLED',
  );
  return waiting[0] ?? orders[0];
}

export async function runBasketRefinement(
  suggestionId: string,
  deps: AssistantEngineDeps,
  ctx: AssistantEngineContext,
  session: AssistantSessionState,
): Promise<AssistantTurn> {
  const criteria = session.lastBasketCriteria;
  if (!criteria) return unknownReply();

  const suffix =
    suggestionId === 'basket_cheaper'
      ? 'أرخص'
      : suggestionId === 'basket_free_delivery'
        ? 'توصيل مجاني'
        : 'أكثر تنوع';

  const kw = criteria.categoryKeywords?.[0] ?? '';
  return runAssistantMessage(`بدي سلة ${kw} ب${criteria.budget} ${suffix}`, deps, ctx, session);
}

export type { BasketSuggestion };
