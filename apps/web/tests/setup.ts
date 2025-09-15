import '@testing-library/jest-dom';

// Mock import.meta for Jest environment
(globalThis as any).import = {
  meta: {
    env: {
      VITE_COGNITO_USER_POOL_ID: 'test-user-pool-id',
      VITE_COGNITO_CLIENT_ID: 'test-client-id',
      VITE_COGNITO_DOMAIN: 'test-domain',
      VITE_AWS_REGION: 'us-west-2',
      VITE_API_BASE_URL: 'http://localhost:3001/api',
      VITE_APP_NAME: 'EC2 Instance Manager',
      VITE_APP_VERSION: '1.0.0',
      DEV: true,
      PROD: false,
    },
  },
};

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
