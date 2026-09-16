import { describe, expect, it } from 'vitest';
import { classifyAssistantQuery, extractProductSearchTerm } from './intents';

describe('assistant intents', () => {
  it('detects order status queries', () => {
    expect(classifyAssistantQuery('وين طلبي؟').intent).toBe('order_status');
  });

  it('detects free delivery without product search', () => {
    expect(classifyAssistantQuery('كيف أوصل للتوصيل المجاني؟').intent).toBe('free_delivery');
    expect(classifyAssistantQuery('باقي لي 15%').intent).toBe('free_delivery');
  });

  it('detects product search for shopping queries', () => {
    const parsed = classifyAssistantQuery('بدي سماعة منيحة للجيم');
    expect(parsed.intent).toBe('natural_shopping');
  });

  it('detects category search for short category terms', () => {
    expect(classifyAssistantQuery('خضار').intent).toBe('category_search');
    expect(classifyAssistantQuery('فواكه').intent).toBe('category_search');
  });

  it('detects basket builder with budget', () => {
    const parsed = classifyAssistantQuery('بدي تشكيلة فواكه بـ100 شيكل');
    expect(parsed.intent).toBe('basket_builder');
    expect(parsed.budget).toBe(100);
  });

  it('detects value-oriented basket goal', () => {
    const parsed = classifyAssistantQuery('بدي أرخص سلة فواكه بـ100');
    expect(parsed.intent).toBe('basket_builder');
    expect(parsed.basketGoal).toBe('value');
  });

  it('detects recipe shopping vs cooking knowledge', () => {
    expect(classifyAssistantQuery('شو بحتاج أشتري للمقلوبة؟').intent).toBe('recipe_shopping');
    expect(classifyAssistantQuery('كيف أطبخ المقلوبة؟').intent).toBe('cooking_general');
  });

  it('detects natural shopping themes', () => {
    expect(classifyAssistantQuery('بدي شي للفطور').intent).toBe('natural_shopping');
  });

  it('detects support escalation for technical issues', () => {
    expect(classifyAssistantQuery('عندي مشكلة تقنية بالتطبيق').intent).toBe('support');
  });

  it('extracts cleaner search terms', () => {
    expect(extractProductSearchTerm('بدي سماعة للجيم')).toMatch(/سماع/);
  });
});
