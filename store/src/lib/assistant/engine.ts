import {
  runAssistantMessage,
  runBasketRefinement,
  runProductSelection,
} from './controller';
import { getSuggestionsForContext, WELCOME_SUGGESTIONS } from './suggestions';
import { buildWelcomeTurn } from './welcome';
import type {
  AssistantEngineContext,
  AssistantEngineDeps,
  AssistantQuickActionId,
  AssistantSessionState,
  AssistantTurn,
} from './types';

export { buildWelcomeTurn, runProductSelection, runBasketRefinement };

export async function runUserMessage(
  text: string,
  deps: AssistantEngineDeps,
  ctx: AssistantEngineContext,
  session?: AssistantSessionState,
): Promise<AssistantTurn> {
  return runAssistantMessage(text, deps, ctx, session);
}

export async function runQuickAction(
  actionId: AssistantQuickActionId,
  deps: AssistantEngineDeps,
  ctx: AssistantEngineContext,
): Promise<AssistantTurn> {
  switch (actionId) {
    case 'discover_products':
      return {
        reply: 'اكتب اسم المنتج أو الفئة اللي بدك إياها — مثلاً: سماعة، خضار، أو «بدي فواكه بـ100» 👇',
        suggestions: WELCOME_SUGGESTIONS.filter((s) => s.id !== 'discover_products'),
        suggestionContext: 'welcome',
      };
    case 'free_delivery':
      return runAssistantMessage('كيف أوصل للتوصيل المجاني؟', deps, ctx);
    case 'my_orders':
      return runAssistantMessage('وين طلبي؟', deps, ctx);
    case 'popular':
      return runAssistantMessage('شو أكثر المنتجات طلبًا؟', deps, ctx);
    case 'gift':
      return {
        reply: '🎁 جميل! لمين الهدية؟ اكتب نوع المنتج أو الفئة اللي بدك إياها.',
        suggestions: getSuggestionsForContext('products'),
        suggestionContext: 'products',
      };
    default:
      return buildWelcomeTurn();
  }
}

const QUICK_ACTION_IDS = new Set([
  'discover_products',
  'free_delivery',
  'my_orders',
  'popular',
  'gift',
]);

export async function runContextualSuggestion(
  suggestionId: string,
  deps: AssistantEngineDeps,
  ctx: AssistantEngineContext,
  session: AssistantSessionState = {},
): Promise<AssistantTurn> {
  if (suggestionId === 'contact_support' || suggestionId === 'order_problem') {
    return runAssistantMessage('عندي مشكلة تقنية', deps, ctx);
  }
  if (suggestionId === 'free_delivery_boost') {
    return runAssistantMessage('باقي لي على التوصيل المجاني', deps, ctx);
  }
  if (suggestionId === 'cheaper_options' && session.lastSearchTerm) {
    return runAssistantMessage(`بدي أرخص ${session.lastSearchTerm}`, deps, ctx, session);
  }
  if (suggestionId === 'more_options' && session.lastSearchTerm) {
    return runAssistantMessage(session.lastSearchTerm, deps, ctx, session);
  }
  if (suggestionId === 'browse_fruits') {
    return runAssistantMessage('فواكه', deps, ctx, session);
  }
  if (suggestionId === 'recipe_ingredients') {
    return runAssistantMessage('شو بحتاج أشتري للمقلوبة؟', deps, ctx, session);
  }
  if (suggestionId === 'build_basket' || suggestionId === 'build_basket_from_recipe') {
    const budget = session.lastBasketCriteria?.budget ?? 100;
    const kw = session.lastBasketCriteria?.categoryKeywords?.[0] ?? 'فواكه';
    return runAssistantMessage(`بدي سلة ${kw} ب${budget}`, deps, ctx, session);
  }
  if (suggestionId.startsWith('basket_')) {
    return runBasketRefinement(suggestionId, deps, ctx, session);
  }
  if (suggestionId === 'similar_products' && session.lastProductId) {
    return runProductSelection(session.lastProductId, deps, ctx);
  }
  if (suggestionId === 'track_order' || suggestionId === 'order_details') {
    return runAssistantMessage('وين طلبي؟', deps, ctx);
  }
  if (QUICK_ACTION_IDS.has(suggestionId)) {
    return runQuickAction(suggestionId as AssistantQuickActionId, deps, ctx);
  }
  return runAssistantMessage('مساعدة', deps, ctx);
}
