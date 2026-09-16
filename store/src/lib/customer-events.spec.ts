import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  recordCustomerEvent,
  resetCustomerEventDedupe,
} from './customer-events';

vi.mock('@/lib/store-api', () => ({
  storeApi: {
    recordCustomerEvent: vi.fn().mockResolvedValue({ id: '1', createdAt: new Date().toISOString() }),
  },
}));

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: {
    getState: () => ({ isAuthenticated: true }),
  },
}));

describe('customer events', () => {
  beforeEach(() => {
    resetCustomerEventDedupe();
    vi.clearAllMocks();
  });

  it('dedupes identical events within the window', async () => {
    const { storeApi } = await import('@/lib/store-api');
    const payload = {
      type: 'SEARCH_QUERY' as const,
      searchTerm: 'tea',
      source: 'search',
    };

    recordCustomerEvent(payload);
    recordCustomerEvent(payload);

    expect(storeApi.recordCustomerEvent).toHaveBeenCalledTimes(1);
  });
});
