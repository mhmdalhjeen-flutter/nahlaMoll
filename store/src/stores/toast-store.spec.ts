import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  resolveToastDuration,
  TOAST_DURATION_DEFAULT_MS,
  TOAST_DURATION_NEW_OFFER_MS,
  TOAST_DURATION_WITH_ACTION_MS,
  useToastStore,
} from './toast-store';

function resetToastStore() {
  useToastStore.setState({
    top: { active: null, queue: [] },
    bottom: { active: null, queue: [] },
  });
}

describe('toast-store FIFO queue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetToastStore();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    resetToastStore();
  });

  it('shows the first toast as active immediately', () => {
    useToastStore.getState().show('A', 'success');

    expect(useToastStore.getState().top.active?.message).toBe('A');
    expect(useToastStore.getState().top.queue).toHaveLength(0);
  });

  it('queues second and third toasts in FIFO order', () => {
    const show = useToastStore.getState().show;
    show('A', 'success');
    show('B', 'success');
    show('C', 'success');

    expect(useToastStore.getState().top.active?.message).toBe('A');
    expect(useToastStore.getState().top.queue.map((t) => t.message)).toEqual([
      'B',
      'C',
    ]);
  });

  it('promotes pending toasts after timeout in FIFO order', () => {
    const show = useToastStore.getState().show;
    show('A', 'success');
    show('B', 'success');
    show('C', 'success');

    vi.advanceTimersByTime(TOAST_DURATION_DEFAULT_MS);
    expect(useToastStore.getState().top.active?.message).toBe('B');

    vi.advanceTimersByTime(TOAST_DURATION_DEFAULT_MS);
    expect(useToastStore.getState().top.active?.message).toBe('C');

    vi.advanceTimersByTime(TOAST_DURATION_DEFAULT_MS);
    expect(useToastStore.getState().top.active).toBeNull();
    expect(useToastStore.getState().top.queue).toHaveLength(0);
  });

  it('keeps only one active toast per placement', () => {
    const show = useToastStore.getState().show;
    show('A', 'success');
    show('B', 'success');

    const { top } = useToastStore.getState();
    expect(top.active).not.toBeNull();
    expect(top.queue).toHaveLength(1);
    expect(top.active?.message).toBe('A');
  });

  it('operates top and bottom queues independently', () => {
    const show = useToastStore.getState().show;
    show('Top A', 'success', undefined, 'top');
    show('Top B', 'success', undefined, 'top');
    show('Bottom X', 'error', undefined, 'bottom');
    show('Bottom Y', 'error', undefined, 'bottom');

    expect(useToastStore.getState().top.active?.message).toBe('Top A');
    expect(useToastStore.getState().top.queue.map((t) => t.message)).toEqual([
      'Top B',
    ]);
    expect(useToastStore.getState().bottom.active?.message).toBe('Bottom X');
    expect(useToastStore.getState().bottom.queue.map((t) => t.message)).toEqual([
      'Bottom Y',
    ]);
  });

  it('promotes the next toast immediately on manual close', () => {
    const { show, dismiss } = useToastStore.getState();
    show('A', 'success');
    show('B', 'success');
    show('C', 'success');

    const activeId = useToastStore.getState().top.active?.id;
    expect(activeId).toBeTruthy();
    dismiss(activeId!);

    expect(useToastStore.getState().top.active?.message).toBe('B');
    expect(useToastStore.getState().top.queue.map((t) => t.message)).toEqual([
      'C',
    ]);
  });

  it('executes action and advances the queue', () => {
    const onAction = vi.fn();
    const { show, dismiss } = useToastStore.getState();
    show('A', 'info', { label: 'تراجع', onClick: onAction }, 'bottom');
    show('B', 'info', undefined, 'bottom');

    const active = useToastStore.getState().bottom.active!;
    active.action!.onClick();
    dismiss(active.id);

    expect(onAction).toHaveBeenCalledTimes(1);
    expect(useToastStore.getState().bottom.active?.message).toBe('B');
  });

  it('does not double-advance when dismiss is called twice for the same toast', () => {
    const { show, dismiss } = useToastStore.getState();
    show('A', 'success');
    show('B', 'success');

    const activeId = useToastStore.getState().top.active?.id!;
    dismiss(activeId);
    dismiss(activeId);

    expect(useToastStore.getState().top.active?.message).toBe('B');
    expect(useToastStore.getState().top.queue).toHaveLength(0);
  });

  it('replaces a pending duplicate by dedupeKey instead of enqueueing another copy', () => {
    const { show } = useToastStore.getState();
    show('A', 'success');
    show('Offer v1', 'info', undefined, 'top', {
      dedupeKey: 'offer:1',
    });
    show('Offer v2', 'info', undefined, 'top', {
      dedupeKey: 'offer:1',
    });

    expect(useToastStore.getState().top.active?.message).toBe('A');
    expect(useToastStore.getState().top.queue).toHaveLength(1);
    expect(useToastStore.getState().top.queue[0]?.message).toBe('Offer v2');
  });

  it('does not replace the active toast when dedupeKey matches active toast', () => {
    const { show } = useToastStore.getState();
    show('Active offer', 'info', undefined, 'top', { dedupeKey: 'offer:1' });
    show('Pending offer', 'info', undefined, 'top', { dedupeKey: 'offer:1' });

    expect(useToastStore.getState().top.active?.message).toBe('Active offer');
    expect(useToastStore.getState().top.queue[0]?.message).toBe(
      'Pending offer',
    );
  });

  it('uses default 4000 ms duration without action', () => {
    const { show } = useToastStore.getState();
    show('A', 'success');
    expect(useToastStore.getState().top.active?.duration).toBe(
      TOAST_DURATION_DEFAULT_MS,
    );
  });

  it('uses 6000 ms for action toasts unless duration is overridden', () => {
    expect(
      resolveToastDuration({ label: 'تراجع', onClick: () => undefined }),
    ).toBe(TOAST_DURATION_WITH_ACTION_MS);

    const { show } = useToastStore.getState();
    show(
      'Undo',
      'info',
      { label: 'تراجع', onClick: () => undefined },
      'bottom',
    );
    expect(useToastStore.getState().bottom.active?.duration).toBe(
      TOAST_DURATION_WITH_ACTION_MS,
    );
  });

  it('keeps new-offer clickable toasts at exactly 4000 ms', () => {
    const { show } = useToastStore.getState();
    show(
      'عرض جديد',
      'info',
      { label: 'عرض', onClick: () => undefined },
      'top',
      { duration: TOAST_DURATION_NEW_OFFER_MS, dedupeKey: 'offer:42' },
    );

    expect(useToastStore.getState().top.active?.duration).toBe(4000);
    expect(useToastStore.getState().top.active?.action?.label).toBe('عرض');
  });

  it('does not let a stale timer dismiss a newer active toast', () => {
    const { show, dismiss } = useToastStore.getState();
    show('A', 'success');
    show('B', 'success');

    dismiss(useToastStore.getState().top.active!.id);
    expect(useToastStore.getState().top.active?.message).toBe('B');

    vi.advanceTimersByTime(1000);
    expect(useToastStore.getState().top.active?.message).toBe('B');

    vi.advanceTimersByTime(3000);
    expect(useToastStore.getState().top.active).toBeNull();
  });

  it('preserves existing default placement rules', () => {
    const { show } = useToastStore.getState();
    show('Success', 'success');
    show('Error', 'error');

    expect(useToastStore.getState().top.active?.message).toBe('Success');
    expect(useToastStore.getState().bottom.active?.message).toBe('Error');
  });
});
