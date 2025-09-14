import '@testing-library/jest-dom';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
interface MockIntersectionObserver {
  disconnect: () => void;
  observe: () => void;
  unobserve: () => void;
  takeRecords: () => IntersectionObserverEntry[];
}

(globalThis as typeof globalThis & { IntersectionObserver: unknown }).IntersectionObserver =
  class IntersectionObserver implements MockIntersectionObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    unobserve() {}
    takeRecords() {
      return [];
    }
  };
