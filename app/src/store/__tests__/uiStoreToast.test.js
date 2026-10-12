import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useUiStore } from '../uiStore';

describe('toast timing', () => {
  beforeEach(() => { vi.useFakeTimers(); useUiStore.setState({ toast: null }); });
  afterEach(() => vi.useRealTimers());

  it('normal toasts hide after 3 seconds', () => {
    useUiStore.getState().showToast('Saved', 'success');
    vi.advanceTimersByTime(2999);
    expect(useUiStore.getState().toast?.message).toBe('Saved');
    vi.advanceTimersByTime(1);
    expect(useUiStore.getState().toast).toBeNull();
  });

  it('undo toasts stay up 4 seconds', () => {
    useUiStore.getState().showToast('Undid ATTACK KILL', 'undo');
    vi.advanceTimersByTime(3999);
    expect(useUiStore.getState().toast).toMatchObject({ message: 'Undid ATTACK KILL', variant: 'undo' });
    vi.advanceTimersByTime(1);
    expect(useUiStore.getState().toast).toBeNull();
  });

  it('two undos in a row get a new id (so the pop replays)', () => {
    useUiStore.getState().showToast('Undid point for us', 'undo');
    const first = useUiStore.getState().toast.id;
    vi.advanceTimersByTime(5);
    useUiStore.getState().showToast('Undid point for us', 'undo');
    expect(useUiStore.getState().toast.id).not.toBe(first);
  });
});
