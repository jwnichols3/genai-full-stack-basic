import { test, expect } from '@playwright/test';
import { LoginPage } from '../helpers/page-objects/LoginPage';
import { DashboardPage } from '../helpers/page-objects/DashboardPage';
import { TestHelpers, TEST_USERS } from '../helpers/utilities/test-helpers';
import { TestDataFactory } from '../helpers/test-data/test-data-factory';

test.describe('Performance Baseline Tests', () => {
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
    await TestHelpers.clearAuthState(page);
  });

  test.describe('Page Load Performance', () => {
    test('should load login page within performance threshold', async ({ page }) => {
      const loadTime = await TestHelpers.measurePerformance(page, async () => {
        await loginPage.navigateToLogin();
        await loginPage.waitForLoginFormToLoad();
      });

      // Should load within 2 seconds
      expect(loadTime).toBeLessThan(2000);

      // Verify page performance metrics
      const perfMetrics = await TestHelpers.checkPagePerformance(page);
      expect(perfMetrics.loadTime).toBeLessThan(3000);
      expect(perfMetrics.domContentLoaded).toBeLessThan(1500);
    });

    test('should load dashboard within performance threshold', async ({ page }) => {
      await TestHelpers.loginUser(page, TEST_USERS.user);

      const dashboardLoadTime = await TestHelpers.measurePerformance(page, async () => {
        await dashboardPage.navigateToDashboard();
        await dashboardPage.waitForDashboardToLoad();
      });

      // Should load within 3 seconds
      expect(dashboardLoadTime).toBeLessThan(3000);

      const perfMetrics = await TestHelpers.checkPagePerformance(page);
      expect(perfMetrics.loadTime).toBeLessThan(5000);
    });

    test('should render instance list within threshold', async ({ page }) => {
      await TestHelpers.loginUser(page, TEST_USERS.user);

      // Mock large dataset
      const mockInstances = TestDataFactory.createTestInstances(20);
      await TestHelpers.mockAPIResponse(page, /.*\/instances/, mockInstances);

      const renderTime = await TestHelpers.measurePerformance(page, async () => {
        await dashboardPage.refreshInstanceList();
        await dashboardPage.waitForLoadingToComplete();
      });

      // Should render within 1.5 seconds
      expect(renderTime).toBeLessThan(1500);
    });

    test('should handle large datasets efficiently', async ({ page }) => {
      await TestHelpers.loginUser(page, TEST_USERS.user);

      // Mock very large dataset
      const mockInstances = TestDataFactory.createTestInstances(100);
      await TestHelpers.mockAPIResponse(page, /.*\/instances/, mockInstances);

      const renderTime = await TestHelpers.measurePerformance(page, async () => {
        await dashboardPage.refreshInstanceList();
        await dashboardPage.waitForLoadingToComplete();
      });

      // Should still render within acceptable time
      expect(renderTime).toBeLessThan(2500);

      // Check if virtualization or pagination is used for performance
      const instanceElements = page.locator('[data-testid="instance-card"]');
      const visibleCount = await instanceElements.count();

      // If showing all 100 items, ensure performance is acceptable
      if (visibleCount === 100) {
        // Memory usage should be reasonable
        const memoryUsage = await TestHelpers.getMemoryUsage(page);
        if (memoryUsage) {
          expect(memoryUsage.usedJSHeapSize).toBeLessThan(50 * 1024 * 1024); // 50MB
        }
      }
    });
  });

  test.describe('Login Flow Performance', () => {
    test('should complete login within performance threshold', async ({ page }) => {
      await loginPage.navigateToLogin();

      const loginTime = await TestHelpers.measurePerformance(page, async () => {
        await loginPage.login(TEST_USERS.user.email, TEST_USERS.user.password);
        await expect(page).toHaveURL(/\/dashboard/);
      });

      // Should complete within 2 seconds
      expect(loginTime).toBeLessThan(2000);
    });

    test('should handle authentication API calls efficiently', async ({ page }) => {
      await loginPage.navigateToLogin();

      // Monitor network requests during login
      const requests: any[] = [];
      page.on('request', (request) => {
        if (request.url().includes('/auth') || request.url().includes('/login')) {
          requests.push({
            url: request.url(),
            method: request.method(),
            timestamp: Date.now(),
          });
        }
      });

      const startTime = Date.now();
      await loginPage.login(TEST_USERS.user.email, TEST_USERS.user.password);
      await expect(page).toHaveURL(/\/dashboard/);
      const endTime = Date.now();

      // Should make minimal auth requests
      expect(requests.length).toBeLessThanOrEqual(2);

      // All requests should complete quickly
      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(2000);
    });
  });

  test.describe('Instance Action Performance', () => {
    test('should complete instance state changes within threshold', async ({ page }) => {
      await TestHelpers.loginUser(page, TEST_USERS.user);

      const mockInstances = TestDataFactory.createTestInstances(1, { state: 'stopped' });
      await TestHelpers.mockAPIResponse(page, /.*\/instances$/, mockInstances);
      await dashboardPage.refreshInstanceList();

      // Mock successful state change
      await TestHelpers.mockAPIResponse(page, /.*\/instances.*\/start/, {
        success: true,
        message: 'Instance starting',
      });

      const actionTime = await TestHelpers.measurePerformance(page, async () => {
        await dashboardPage.startInstance('test-instance-1');
        // Wait for UI to reflect the change
        await page.waitForTimeout(100);
      });

      // Should complete within 5 seconds
      expect(actionTime).toBeLessThan(5000);
    });

    test('should handle batch operations efficiently', async ({ page }) => {
      await TestHelpers.loginUser(page, TEST_USERS.user);

      const mockInstances = TestDataFactory.createTestInstances(10, { state: 'stopped' });
      await TestHelpers.mockAPIResponse(page, /.*\/instances$/, mockInstances);
      await dashboardPage.refreshInstanceList();

      // Mock batch operation
      await TestHelpers.mockAPIResponse(page, /.*\/instances\/batch/, {
        success: true,
        processed: 10,
      });

      // If batch operations are implemented
      const batchSelect = page.locator('[data-testid="select-all"]');
      if (await batchSelect.isVisible()) {
        const batchTime = await TestHelpers.measurePerformance(page, async () => {
          await batchSelect.check();
          const batchStart = page.locator('button:has-text("Start Selected")');
          if (await batchStart.isVisible()) {
            await batchStart.click();
            await dashboardPage.confirmAction();
          }
        });

        // Batch operations should complete within 8 seconds
        expect(batchTime).toBeLessThan(8000);
      }
    });
  });

  test.describe('Network Performance', () => {
    test('should handle slow network conditions gracefully', async ({ page }) => {
      await TestHelpers.loginUser(page, TEST_USERS.user);

      // Simulate slow network
      await TestHelpers.simulateSlowNetwork(page);

      const loadTime = await TestHelpers.measurePerformance(page, async () => {
        await dashboardPage.refreshInstanceList();
        await dashboardPage.waitForLoadingToComplete();
      });

      // Should show loading states during slow network
      // Time will be longer but should complete
      expect(loadTime).toBeLessThan(10000);
    });

    test('should optimize API calls to minimize requests', async ({ page }) => {
      await TestHelpers.loginUser(page, TEST_USERS.user);

      // Monitor network requests
      const apiCalls: any[] = [];
      page.on('request', (request) => {
        if (request.url().includes('/api/')) {
          apiCalls.push({
            url: request.url(),
            method: request.method(),
            timestamp: Date.now(),
          });
        }
      });

      await dashboardPage.refreshInstanceList();
      await dashboardPage.waitForLoadingToComplete();

      // Should make minimal API calls for initial load
      const instanceCalls = apiCalls.filter((call) => call.url.includes('/instances'));
      expect(instanceCalls.length).toBeLessThanOrEqual(2);
    });

    test('should implement caching for repeated requests', async ({ page }) => {
      await TestHelpers.loginUser(page, TEST_USERS.user);

      // First load
      const firstLoadTime = await TestHelpers.measurePerformance(page, async () => {
        await dashboardPage.refreshInstanceList();
        await dashboardPage.waitForLoadingToComplete();
      });

      // Immediate second load (should be cached)
      const cachedLoadTime = await TestHelpers.measurePerformance(page, async () => {
        await dashboardPage.refreshInstanceList();
        await dashboardPage.waitForLoadingToComplete();
      });

      // Cached load should be faster (if caching is implemented)
      if (cachedLoadTime < firstLoadTime) {
        expect(cachedLoadTime).toBeLessThan(firstLoadTime * 0.5);
      }
    });
  });

  test.describe('Memory Performance', () => {
    test('should not have memory leaks during normal usage', async ({ page }) => {
      await TestHelpers.loginUser(page, TEST_USERS.user);

      const initialMemory = await TestHelpers.getMemoryUsage(page);

      // Perform multiple operations
      for (let i = 0; i < 5; i++) {
        await dashboardPage.refreshInstanceList();
        await dashboardPage.waitForLoadingToComplete();
        await page.waitForTimeout(500);
      }

      const finalMemory = await TestHelpers.getMemoryUsage(page);

      if (initialMemory && finalMemory) {
        // Memory should not increase dramatically
        const memoryIncrease = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
        const maxAcceptableIncrease = 10 * 1024 * 1024; // 10MB

        expect(memoryIncrease).toBeLessThan(maxAcceptableIncrease);
      }
    });

    test('should handle component unmounting without leaks', async ({ page }) => {
      await TestHelpers.loginUser(page, TEST_USERS.user);

      const initialMemory = await TestHelpers.getMemoryUsage(page);

      // Navigate away and back multiple times
      for (let i = 0; i < 3; i++) {
        await page.goto('/login');
        await TestHelpers.loginUser(page, TEST_USERS.user);
        await dashboardPage.waitForDashboardToLoad();
      }

      const finalMemory = await TestHelpers.getMemoryUsage(page);

      if (initialMemory && finalMemory) {
        // Should not leak significant memory
        const memoryIncrease = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
        expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024); // 5MB
      }
    });
  });

  test.describe('Page Transition Performance', () => {
    test('should navigate between pages quickly', async ({ page }) => {
      await TestHelpers.loginUser(page, TEST_USERS.user);

      const navigationTime = await TestHelpers.measurePerformance(page, async () => {
        await page.goto('/login');
        await loginPage.waitForLoginFormToLoad();
      });

      // Navigation should be fast
      expect(navigationTime).toBeLessThan(1000);
    });

    test('should handle browser back/forward efficiently', async ({ page }) => {
      await TestHelpers.loginUser(page, TEST_USERS.user);
      await page.goto('/login');

      const backNavigationTime = await TestHelpers.measurePerformance(page, async () => {
        await page.goBack();
        await expect(page).toHaveURL(/\/dashboard/);
      });

      // Back navigation should be very fast (likely cached)
      expect(backNavigationTime).toBeLessThan(500);
    });
  });

  test.describe('Performance Monitoring', () => {
    test('should track Core Web Vitals', async ({ page }) => {
      await TestHelpers.loginUser(page, TEST_USERS.user);

      const webVitals = await page.evaluate(() => {
        return new Promise((resolve) => {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const vitals: any = {};

            entries.forEach((entry) => {
              if (entry.name === 'first-contentful-paint') {
                vitals.fcp = entry.startTime;
              }
              if (entry.name === 'largest-contentful-paint') {
                vitals.lcp = entry.startTime;
              }
            });

            if (vitals.fcp || vitals.lcp) {
              resolve(vitals);
            }
          });

          observer.observe({ entryTypes: ['paint', 'largest-contentful-paint'] });

          // Timeout after 5 seconds
          setTimeout(() => resolve({}), 5000);
        });
      });

      // Check Core Web Vitals thresholds
      if ((webVitals as any).fcp) {
        expect((webVitals as any).fcp).toBeLessThan(2000); // FCP < 2s
      }

      if ((webVitals as any).lcp) {
        expect((webVitals as any).lcp).toBeLessThan(2500); // LCP < 2.5s
      }
    });

    test('should have acceptable bundle size impact', async ({ page }) => {
      await page.goto('/');

      // Check for resource sizes
      const resources = await page.evaluate(() => {
        return performance
          .getEntriesByType('resource')
          .filter((entry: any) => entry.name.includes('.js') || entry.name.includes('.css'))
          .map((entry: any) => ({
            name: entry.name,
            size: entry.transferSize,
            type: entry.name.includes('.js') ? 'js' : 'css',
          }));
      });

      // Main bundle should be reasonable size
      const mainBundle = resources.find(
        (r: any) => r.name.includes('main') || r.name.includes('index')
      );

      if (mainBundle) {
        // Main bundle should be under 1MB
        expect(mainBundle.size).toBeLessThan(1024 * 1024);
      }

      // Total JS size should be reasonable
      const totalJSSize = resources
        .filter((r: any) => r.type === 'js')
        .reduce((total: number, r: any) => total + r.size, 0);

      expect(totalJSSize).toBeLessThan(2 * 1024 * 1024); // 2MB total
    });
  });
});
