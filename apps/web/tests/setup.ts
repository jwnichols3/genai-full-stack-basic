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
interface MockIntersectionObserverEntry {
  boundingClientRect: DOMRectReadOnly;
  intersectionRatio: number;
  intersectionRect: DOMRectReadOnly;
  isIntersecting: boolean;
  rootBounds: DOMRectReadOnly | null;
  target: Element;
  time: number;
}

interface MockIntersectionObserver {
  root: Element | null;
  rootMargin: string;
  thresholds: ReadonlyArray<number>;
  disconnect: () => void;
  observe: (target: Element) => void;
  unobserve: (target: Element) => void;
  takeRecords: () => MockIntersectionObserverEntry[];
}

(globalThis as typeof globalThis & { IntersectionObserver: unknown }).IntersectionObserver =
  class IntersectionObserver implements MockIntersectionObserver {
    root: Element | null = null;
    rootMargin: string = '0px';
    thresholds: ReadonlyArray<number> = [];

    constructor() {}
    disconnect() {}
    observe(_target: Element) {}
    unobserve(_target: Element) {}
    takeRecords(): MockIntersectionObserverEntry[] {
      return [];
    }
  };
