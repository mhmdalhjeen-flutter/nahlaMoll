import { describe, expect, it, vi, beforeEach } from 'vitest';
import { recordAssistantInteraction } from './interactions';

vi.mock('@/lib/customer-events', () => ({
  recordCustomerEvent: vi.fn(),
}));

describe('assistant interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates to unified customer event pipeline with chatbot source', async () => {
    const { recordCustomerEvent } = await import('@/lib/customer-events');
    const payload = {
      type: 'CHAT_INTENT' as const,
      intent: 'product_search',
    };

    recordAssistantInteraction(payload);

    expect(recordCustomerEvent).toHaveBeenCalledTimes(1);
    expect(recordCustomerEvent).toHaveBeenCalledWith({
      ...payload,
      source: 'chatbot',
    });
  });
});
