import { FullConfig } from '@playwright/test';

/**
 * Global teardown for Playwright tests
 * This runs once after all tests complete
 */
async function globalTeardown(_config: FullConfig) {
  console.log('🧹 Running global teardown...');

  // Optional: Cleanup tasks after all tests
  // - Clear test data
  // - Reset test environment
  // - Send test reports

  console.log('✅ Global teardown completed');
}

export default globalTeardown;
