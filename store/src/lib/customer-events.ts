import { storeApi } from '@/lib/store-api';
import { useAuthStore } from '@/stores/auth-store';
import type { CustomerEventPayload } from './customer-events.types';

const SESSION_KEY = 'customer_session_id';
const GUEST_QUEUE_KEY = 'customer_events_guest';
const LEGACY_ASSISTANT_KEY = 'assistant_interactions_guest';
const GUEST_MAX = 50;
const DEDUPE_MS = 2000;

interface StoredGuestEvent extends CustomerEventPayload {
  createdAt: string;
}

let lastRecorded: { key: string; at: number } | null = null;

function eventKey(payload: CustomerEventPayload): string {
  return JSON.stringify({
    type: payload.type,
    searchTerm: payload.searchTerm,
    productId: payload.productId,
    categoryId: payload.categoryId,
    intent: payload.intent,
    context: payload.context,
    source: payload.source,
  });
}

/** Stable anonymous session id for guest behavioral tracking. */
export function getCustomerSessionId(): string {
  if (typeof window === 'undefined') return '';
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

function readGuestQueue(): StoredGuestEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(GUEST_QUEUE_KEY);
    if (!raw) return migrateLegacyAssistantQueue();
    const parsed = JSON.parse(raw) as StoredGuestEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function migrateLegacyAssistantQueue(): StoredGuestEvent[] {
  try {
    const legacyRaw = localStorage.getItem(LEGACY_ASSISTANT_KEY);
    if (!legacyRaw) return [];
    const legacy = JSON.parse(legacyRaw) as StoredGuestEvent[];
    if (!Array.isArray(legacy) || legacy.length === 0) return [];
    localStorage.removeItem(LEGACY_ASSISTANT_KEY);
    writeGuestQueue(legacy);
    return legacy;
  } catch {
    return [];
  }
}

function writeGuestQueue(items: StoredGuestEvent[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(GUEST_QUEUE_KEY, JSON.stringify(items.slice(-GUEST_MAX)));
}

function enqueueGuestEvent(payload: CustomerEventPayload) {
  const next = [
    ...readGuestQueue(),
    { ...payload, createdAt: new Date().toISOString() },
  ];
  writeGuestQueue(next);
}

async function postEvent(payload: CustomerEventPayload, sessionId?: string) {
  await storeApi.recordCustomerEvent({
    ...payload,
    ...(sessionId ? { sessionId } : {}),
  });
}

/** Fire-and-forget behavioral signal — never blocks UI. */
export function recordCustomerEvent(payload: CustomerEventPayload): void {
  const key = eventKey(payload);
  const now = Date.now();
  if (lastRecorded?.key === key && now - lastRecorded.at < DEDUPE_MS) {
    return;
  }
  lastRecorded = { key, at: now };

  const isAuthenticated = useAuthStore.getState().isAuthenticated;

  if (!isAuthenticated) {
    const sessionId = getCustomerSessionId();
    enqueueGuestEvent(payload);
    void postEvent(payload, sessionId).catch(() => {
      /* queue retained for merge replay */
    });
    return;
  }

  void postEvent(payload).catch(() => {
    /* non-blocking */
  });
}

/** Attach guest session events to the authenticated customer and replay queued events. */
export async function mergeCustomerSessionOnAuth(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!useAuthStore.getState().isAuthenticated) return;

  const sessionId = getCustomerSessionId();
  if (sessionId) {
    try {
      await storeApi.mergeCustomerSession(sessionId);
    } catch {
      /* merge is best-effort */
    }
  }

  const queued = readGuestQueue();
  if (queued.length === 0) return;

  writeGuestQueue([]);
  for (const item of queued) {
    const { createdAt: _createdAt, ...payload } = item;
    try {
      await storeApi.recordCustomerEvent(payload);
    } catch {
      enqueueGuestEvent(payload);
      break;
    }
  }
}

/** Test helper */
export function resetCustomerEventDedupe(): void {
  lastRecorded = null;
}
