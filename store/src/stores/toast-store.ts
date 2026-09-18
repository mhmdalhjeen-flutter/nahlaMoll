'use client';

import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info';
export type ToastPlacement = 'top' | 'bottom';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastEnqueueOptions {
  duration?: number;
  dedupeKey?: string;
  priority?: 'normal' | 'high';
}

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
  placement: ToastPlacement;
  action?: ToastAction;
  dedupeKey?: string;
  priority?: 'normal' | 'high';
}

interface PlacementQueue {
  active: ToastItem | null;
  queue: ToastItem[];
}

interface ToastState {
  top: PlacementQueue;
  bottom: PlacementQueue;
  show: (
    message: string,
    type?: ToastType,
    action?: ToastAction,
    placement?: ToastPlacement,
    options?: ToastEnqueueOptions,
  ) => void;
  dismiss: (id: string) => void;
}

export const TOAST_DURATION_DEFAULT_MS = 4000;
export const TOAST_DURATION_WITH_ACTION_MS = 6000;
/** Clickable new-offer toasts must stay 4s even when an action is present. */
export const TOAST_DURATION_NEW_OFFER_MS = 4000;

const PLACEMENTS: ToastPlacement[] = ['top', 'bottom'];

const dismissTimers = new Map<ToastPlacement, ReturnType<typeof setTimeout>>();
const dismissingIds = new Set<string>();

function emptyQueue(): PlacementQueue {
  return { active: null, queue: [] };
}

function resolvePlacement(
  type: ToastType,
  placement?: ToastPlacement,
): ToastPlacement {
  return placement ?? (type === 'success' ? 'top' : 'bottom');
}

export function resolveToastDuration(
  action?: ToastAction,
  explicitDuration?: number,
): number {
  if (explicitDuration !== undefined) {
    return explicitDuration;
  }
  return action ? TOAST_DURATION_WITH_ACTION_MS : TOAST_DURATION_DEFAULT_MS;
}

function clearDismissTimer(placement: ToastPlacement) {
  const timer = dismissTimers.get(placement);
  if (timer !== undefined) {
    clearTimeout(timer);
    dismissTimers.delete(placement);
  }
}

function createToastItem(
  message: string,
  type: ToastType,
  action: ToastAction | undefined,
  placement: ToastPlacement,
  options?: ToastEnqueueOptions,
): ToastItem {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    message,
    type,
    action,
    placement,
    duration: resolveToastDuration(action, options?.duration),
    dedupeKey: options?.dedupeKey,
    priority: options?.priority ?? 'normal',
  };
}

function replacePendingByDedupeKey(
  queue: ToastItem[],
  item: ToastItem,
): ToastItem[] | null {
  if (!item.dedupeKey) return null;
  const index = queue.findIndex((queued) => queued.dedupeKey === item.dedupeKey);
  if (index < 0) return null;
  const next = [...queue];
  next[index] = item;
  return next;
}

function appendToQueue(queue: ToastItem[], item: ToastItem): ToastItem[] {
  if (item.priority === 'high') {
    return [item, ...queue];
  }
  return [...queue, item];
}

type ToastStoreApi = {
  getState: () => ToastState;
  setState: (
    partial:
      | Partial<ToastState>
      | ((state: ToastState) => Partial<ToastState>),
  ) => void;
};

function scheduleDismiss(
  api: ToastStoreApi,
  placement: ToastPlacement,
  item: ToastItem,
) {
  clearDismissTimer(placement);
  const timer = setTimeout(() => {
    dismissActiveToast(api, placement, item.id);
  }, item.duration);
  dismissTimers.set(placement, timer);
}

function promoteNextToast(api: ToastStoreApi, placement: ToastPlacement) {
  const bucket = api.getState()[placement];
  if (bucket.queue.length === 0) {
    api.setState({ [placement]: emptyQueue() });
    return;
  }

  const [next, ...rest] = bucket.queue;
  api.setState({ [placement]: { active: next, queue: rest } });
  scheduleDismiss(api, placement, next);
}

function dismissActiveToast(
  api: ToastStoreApi,
  placement: ToastPlacement,
  id: string,
) {
  if (dismissingIds.has(id)) return;

  const bucket = api.getState()[placement];
  if (bucket.active?.id !== id) return;

  dismissingIds.add(id);
  clearDismissTimer(placement);

  api.setState({
    [placement]: { active: null, queue: bucket.queue },
  });

  promoteNextToast(api, placement);
  dismissingIds.delete(id);
}

function enqueueToast(api: ToastStoreApi, item: ToastItem) {
  const placement = item.placement;
  const bucket = api.getState()[placement];

  const replacedQueue = replacePendingByDedupeKey(bucket.queue, item);
  if (replacedQueue) {
    api.setState({
      [placement]: { active: bucket.active, queue: replacedQueue },
    });
    return;
  }

  if (!bucket.active) {
    api.setState({ [placement]: { active: item, queue: [] } });
    scheduleDismiss(api, placement, item);
    return;
  }

  api.setState({
    [placement]: {
      active: bucket.active,
      queue: appendToQueue(bucket.queue, item),
    },
  });
}

export const useToastStore = create<ToastState>((set, get) => {
  const api: ToastStoreApi = { getState: get, setState: set };

  return {
    top: emptyQueue(),
    bottom: emptyQueue(),

    show: (message, type = 'info', action, placement, options) => {
      const resolvedPlacement = resolvePlacement(type, placement);
      const item = createToastItem(
        message,
        type,
        action,
        resolvedPlacement,
        options,
      );
      enqueueToast(api, item);
    },

    dismiss: (id) => {
      for (const placement of PLACEMENTS) {
        dismissActiveToast(api, placement, id);
      }
    },
  };
});
