import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import usePersistentState from '../usePersistentState';

const isView = (v) => v === 'table' || v === 'kanban';

afterEach(() => vi.restoreAllMocks());

describe('usePersistentState', () => {
  it('uses the default when nothing is stored', () => {
    const { result } = renderHook(() => usePersistentState('k', 'table', isView));
    expect(result.current[0]).toBe('table');
  });

  it('persists updates and restores them on next mount (page reload)', () => {
    const first = renderHook(() => usePersistentState('k', 'table', isView));
    act(() => first.result.current[1]('kanban'));
    expect(first.result.current[0]).toBe('kanban');
    expect(localStorage.getItem('k')).toBe('"kanban"');
    first.unmount();

    const second = renderHook(() => usePersistentState('k', 'table', isView));
    expect(second.result.current[0]).toBe('kanban');
  });

  it('supports functional updates', () => {
    const { result } = renderHook(() => usePersistentState('n', 10));
    act(() => result.current[1]((n) => n + 15));
    expect(result.current[0]).toBe(25);
  });

  it('ignores tampered or corrupted stored values', () => {
    localStorage.setItem('k', '"<script>"');
    expect(renderHook(() => usePersistentState('k', 'table', isView)).result.current[0]).toBe('table');
    localStorage.setItem('k', '{not json');
    expect(renderHook(() => usePersistentState('k', 'table', isView)).result.current[0]).toBe('table');
  });

  it('keeps working in memory when storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    const { result } = renderHook(() => usePersistentState('k', 'table', isView));
    expect(result.current[0]).toBe('table');
    act(() => result.current[1]('kanban'));
    expect(result.current[0]).toBe('kanban');
  });
});
