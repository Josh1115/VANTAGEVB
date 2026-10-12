import { describe, it, expect, vi } from 'vitest';
vi.mock('../../../utils/errorReporting', () => ({ reportError: vi.fn() }));
import { ErrorBoundary } from '../ErrorBoundary';
import { reportError } from '../../../utils/errorReporting';

describe('ErrorBoundary fallback', () => {
  const boom = new Error('boom');

  it('shows children when nothing is wrong', () => {
    const b = new ErrorBoundary({ children: 'kids', fallback: 'small note' });
    b.state = { error: null };
    expect(b.render()).toBe('kids');
  });

  it('shows the small fallback (not the full-page screen) after an error', () => {
    const b = new ErrorBoundary({ children: 'kids', fallback: 'small note' });
    b.state = ErrorBoundary.getDerivedStateFromError(boom);
    expect(b.render()).toBe('small note');
  });

  it('without a fallback it still shows the full-page screen (old behavior)', () => {
    const b = new ErrorBoundary({ children: 'kids' });
    b.state = ErrorBoundary.getDerivedStateFromError(boom);
    expect(b.render()).not.toBe('kids');
    expect(b.render().props.className).toContain('min-h-screen');
  });

  it('still reports the crash', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    new ErrorBoundary({}).componentDidCatch(boom, { componentStack: '' });
    expect(reportError).toHaveBeenCalledWith(expect.objectContaining({ message: 'boom', kind: 'react-boundary' }));
  });
});
