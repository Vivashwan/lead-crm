import { vi } from 'vitest';

// Makes MUI's useMediaQuery treat every max-width query as matching (phone) or not.
export function mockScreen({ phone }) {
  window.matchMedia = vi.fn((query) => ({
    matches: phone ? /max-width/.test(query) : /min-width/.test(query),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    onchange: null,
    dispatchEvent: vi.fn(),
  }));
}

export function resetScreen() {
  delete window.matchMedia;
}
