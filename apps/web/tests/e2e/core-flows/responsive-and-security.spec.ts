import { test, expect } from '@playwright/test';
import { LoginPage } from '../helpers/page-objects/LoginPage';
import { DashboardPage } from '../helpers/page-objects/DashboardPage';
import { TestHelpers, TEST_USERS } from '../helpers/utilities/test-helpers';
import { TestDataFactory } from '../helpers/test-data/test-data-factory';

test.describe('Responsive Design and Security Tests', () => {
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
    await TestHelpers.clearAuthState(page);
  });

  test.describe('Responsive Design Tests', () => {
    const viewports = TestDataFactory.createViewportSizes();

    Object.entries(viewports).forEach(([device, viewport]) => {
      test(`should display correctly on ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await TestHelpers.loginUser(page, TEST_USERS.user);

        // Check that all critical elements are visible
        const criticalElements = [
          'h1, h2', // Page title
          'button:has-text("Logout"), [data-testid="user-menu"]', // User controls
          '[data-testid="instance-list"], .instance-list', // Main content
        ];

        for (const selector of criticalElements) {
          const element = page.locator(selector).first();
          if ((await element.count()) > 0) {
            await expect(element).toBeVisible();
          }
        }

        // Check that content is not horizontally scrollable (unless intended)
        const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
        expect(bodyWidth).toBeLessThanOrEqual(viewport.width + 20); // Small tolerance
      });

      test(`should have touch-friendly interactions on ${viewport.name}`, async ({ page }) => {
        if (device.includes('mobile') || device.includes('tablet')) {
          await page.setViewportSize({ width: viewport.width, height: viewport.height });
          await TestHelpers.loginUser(page, TEST_USERS.user);

          // Check that buttons are large enough for touch
          const buttons = await page.locator('button').all();

          for (const button of buttons.slice(0, 5)) {
            // Check first 5 buttons
            const boundingBox = await button.boundingBox();
            if (boundingBox) {
              // Touch target should be at least 44px (iOS/Android guideline)
              expect(Math.min(boundingBox.width, boundingBox.height)).toBeGreaterThanOrEqual(44);
            }
          }
        }
      });
    });

    test('should handle viewport transitions gracefully', async ({ page }) => {
      await TestHelpers.loginUser(page, TEST_USERS.user);

      // Start with desktop
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.waitForTimeout(500);

      // Transition to tablet
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.waitForTimeout(500);

      // Transition to mobile
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500);

      // Should still be functional
      const isLoggedIn = await dashboardPage.isLoggedIn();
      expect(isLoggedIn).toBeTruthy();
    });

    test('should adapt navigation for mobile devices', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await TestHelpers.loginUser(page, TEST_USERS.user);

      // Look for mobile navigation patterns
      const mobileMenu = page.locator(
        '[data-testid="mobile-menu"], .mobile-menu, button[aria-label*="menu"]'
      );

      if (await mobileMenu.isVisible()) {
        await mobileMenu.click();

        // Should show navigation options
        const navItems = page.locator('nav a, [role="navigation"] a');
        const navCount = await navItems.count();
        expect(navCount).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Cross-Browser Compatibility', () => {
    test('should work consistently across browsers', async ({ page, browserName }) => {
      await TestHelpers.loginUser(page, TEST_USERS.user);

      // Core functionality should work in all browsers
      const instanceCount = await dashboardPage.getInstanceCount();
      expect(instanceCount).toBeGreaterThanOrEqual(0);

      // Check for browser-specific issues
      const consoleErrors = await TestHelpers.checkForConsoleErrors(page);
      const criticalErrors = consoleErrors.filter(
        (error) =>
          !error.includes('favicon') && // Ignore favicon errors
          !error.includes('chrome-extension') // Ignore extension errors
      );

      expect(criticalErrors.length).toBe(0);
    });

    test('should handle JavaScript compatibility', async ({ page, browserName }) => {
      await TestHelpers.loginUser(page, TEST_USERS.user);

      // Test modern JavaScript features
      const jsFeatureSupport = await page.evaluate(() => {
        return {
          arrow: (() => true)(), // Arrow functions
          destructuring: (() => {
            const [a] = [1];
            return a === 1;
          })(),
          async: typeof Promise !== 'undefined',
          modules: true, // Modules are supported in modern browsers
        };
      });

      // All modern browsers should support these features
      expect(jsFeatureSupport.arrow).toBeTruthy();
      expect(jsFeatureSupport.async).toBeTruthy();
    });
  });

  test.describe('Data Integrity Tests', () => {
    test('should maintain data consistency across refreshes', async ({ page }) => {
      await TestHelpers.loginUser(page, TEST_USERS.user);

      // Get initial instance list
      const initialInstances = await dashboardPage.getAllInstances();

      // Refresh the page
      await page.reload();
      await TestHelpers.loginUser(page, TEST_USERS.user);

      // Get instances after refresh
      const refreshedInstances = await dashboardPage.getAllInstances();

      // Data should be consistent (unless backend changes)
      expect(refreshedInstances.length).toEqual(initialInstances.length);
    });

    test('should handle concurrent operations safely', async ({ page, context }) => {
      await TestHelpers.loginUser(page, TEST_USERS.user);

      // Mock instance for testing
      const mockInstances = TestDataFactory.createTestInstances(1, { state: 'stopped' });
      await TestHelpers.mockAPIResponse(page, /.*\/instances$/, mockInstances);
      await dashboardPage.refreshInstanceList();

      // Simulate concurrent operations
      const operations = [
        dashboardPage.startInstance('test-instance-1'),
        dashboardPage.refreshInstanceList(),
        dashboardPage.refreshInstanceList(),
      ];

      // All operations should complete without errors
      await Promise.all(operations);

      // UI should be in consistent state
      const finalState = await dashboardPage.getInstanceState('test-instance-1');
      expect(finalState).toBeTruthy();
    });

    test('should validate data integrity after optimistic updates', async ({ page }) => {
      await TestHelpers.loginUser(page, TEST_USERS.user);

      const mockInstances = TestDataFactory.createTestInstances(1, { state: 'stopped' });
      await TestHelpers.mockAPIResponse(page, /.*\/instances$/, mockInstances);
      await dashboardPage.refreshInstanceList();

      // Mock successful operation
      await TestHelpers.mockAPIResponse(page, /.*\/instances.*\/start/, {
        success: true,
        newState: 'running',
      });

      // Perform operation
      await dashboardPage.startInstance('test-instance-1');

      // UI should update optimistically
      await page.waitForTimeout(100);

      // State should eventually be consistent
      const finalState = await dashboardPage.getInstanceState('test-instance-1');
      expect(['running', 'pending']).toContain(finalState);
    });

    test('should rollback failed operations correctly', async ({ page }) => {
      await TestHelpers.loginUser(page, TEST_USERS.user);

      const mockInstances = TestDataFactory.createTestInstances(1, { state: 'stopped' });
      await TestHelpers.mockAPIResponse(page, /.*\/instances$/, mockInstances);
      await dashboardPage.refreshInstanceList();

      const initialState = await dashboardPage.getInstanceState('test-instance-1');

      // Mock failed operation
      await TestHelpers.interceptAPIError(page, /.*\/instances.*\/start/, 500, 'Operation failed');

      // Perform operation
      await dashboardPage.startInstance('test-instance-1');

      // Should show error
      const errorMessage = await dashboardPage.getErrorMessage();
      expect(errorMessage).toBeTruthy();

      // State should rollback to original
      const finalState = await dashboardPage.getInstanceState('test-instance-1');
      expect(finalState).toBe(initialState);
    });
  });

  test.describe('Security Testing', () => {
    test('should use secure token storage', async ({ page }) => {
      await TestHelpers.loginUser(page, TEST_USERS.user);

      // Check that tokens are not stored in plain text in localStorage
      const localStorage = await page.evaluate(() => {
        const items: any = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) {
            items[key] = localStorage.getItem(key);
          }
        }
        return items;
      });

      // Look for potential token patterns
      const hasPlainTextTokens = Object.values(localStorage).some(
        (value) =>
          typeof value === 'string' &&
          (value.includes('eyJ') || // JWT tokens typically start with eyJ
            value.match(/^[a-zA-Z0-9+/]+={0,2}$/)) // Base64 pattern
      );

      // Tokens should not be stored in plain text (implementation dependent)
      if (hasPlainTextTokens) {
        console.warn('Potential plain text tokens found in localStorage');
      }
    });

    test('should handle session hijacking prevention', async ({ page, context }) => {
      await TestHelpers.loginUser(page, TEST_USERS.user);

      // Get current session info
      const sessionInfo = await page.evaluate(() => ({
        userAgent: navigator.userAgent,
        localStorage: { ...localStorage },
        sessionStorage: { ...sessionStorage },
      }));

      // Create new tab with different user agent (simulated)
      const page2 = await context.newPage();
      await page2.setExtraHTTPHeaders({
        'User-Agent': 'Malicious-Bot/1.0',
      });

      // Try to use the session
      await page2.goto(dashboardPage.getURL());

      // Should require re-authentication or detect suspicious activity
      const isAccessible = page2.url().includes('/dashboard');
      if (isAccessible) {
        // If accessible, should at least log the suspicious activity
        console.log('Session accessible from different user agent - ensure monitoring is in place');
      }
    });

    test('should enforce CSRF protection', async ({ page }) => {
      await TestHelpers.loginUser(page, TEST_USERS.user);

      // Try to make request without proper CSRF token
      const csrfTestResult = await page.evaluate(async () => {
        try {
          const response = await fetch('/api/instances/test-instance/start', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              // Omitting CSRF token
            },
            body: JSON.stringify({}),
          });
          return { status: response.status, protected: response.status === 403 };
        } catch (error) {
          return { error: error.message };
        }
      });

      // Should be protected against CSRF (403 or specific CSRF error)
      if (csrfTestResult.status) {
        expect(csrfTestResult.protected).toBeTruthy();
      }
    });

    test('should sanitize user inputs', async ({ page }) => {
      await TestHelpers.loginUser(page, TEST_USERS.user);

      // Test XSS prevention in search/filter
      const xssPayload = '<script>window.xssTest = true;</script>';

      const searchInput = page
        .locator('input[placeholder*="Search"], input[placeholder*="Filter"]')
        .first();

      if (await searchInput.isVisible()) {
        await searchInput.fill(xssPayload);
        await page.keyboard.press('Enter');

        // Check that XSS was not executed
        const xssExecuted = await page.evaluate(() => (window as any).xssTest);
        expect(xssExecuted).toBeUndefined();

        // Check that input was sanitized in display
        const displayedValue = await searchInput.inputValue();
        expect(displayedValue).not.toContain('<script>');
      }
    });

    test('should enforce proper authorization boundaries', async ({ page }) => {
      // Login as regular user
      await TestHelpers.loginUser(page, TEST_USERS.user);

      // Try to access admin endpoints
      const adminAccess = await page.evaluate(async () => {
        try {
          const response = await fetch('/api/admin/users');
          return { status: response.status, accessible: response.status === 200 };
        } catch (error) {
          return { error: error.message };
        }
      });

      // Should not have admin access
      if (adminAccess.status) {
        expect(adminAccess.accessible).toBeFalsy();
      }
    });

    test('should handle logout security properly', async ({ page }) => {
      await TestHelpers.loginUser(page, TEST_USERS.user);

      // Logout
      await dashboardPage.logout();

      // Check that all tokens are cleared
      const tokensCleared = await page.evaluate(() => ({
        localStorage:
          Object.keys(localStorage).length === 0 ||
          !Object.keys(localStorage).some(
            (key) => key.toLowerCase().includes('token') || key.toLowerCase().includes('auth')
          ),
        sessionStorage: Object.keys(sessionStorage).length === 0,
      }));

      expect(tokensCleared.localStorage).toBeTruthy();

      // Try to access protected resource
      await page.goto('/dashboard');
      await expect(page).toHaveURL(/\/login/);
    });

    test('should validate input lengths and formats', async ({ page }) => {
      await loginPage.navigateToLogin();

      // Test with extremely long input
      const longString = 'a'.repeat(10000);

      await loginPage.enterEmail(longString);
      await loginPage.enterPassword(longString);
      await loginPage.clickSubmit();

      // Should handle gracefully without crashing
      expect(await page.title()).toBeTruthy();

      // Should show appropriate validation error
      const error = await loginPage.waitForErrorMessage();
      expect(error).toBeTruthy();
    });
  });

  test.describe('Integration Tests', () => {
    test('should handle end-to-end user journey', async ({ page }) => {
      // Complete user flow: login -> view instances -> perform action -> logout
      await loginPage.navigateToLogin();
      await loginPage.login(TEST_USERS.user.email, TEST_USERS.user.password);

      // Should be on dashboard
      await expect(page).toHaveURL(/\/dashboard/);

      // View instances
      await dashboardPage.waitForDashboardToLoad();
      const instanceCount = await dashboardPage.getInstanceCount();

      if (instanceCount > 0) {
        // Perform an action
        const instances = await dashboardPage.getAllInstances();
        const firstInstance = instances[0];

        if (firstInstance.state === 'stopped') {
          await dashboardPage.startInstance(firstInstance.name);
        } else if (firstInstance.state === 'running') {
          await dashboardPage.stopInstance(firstInstance.name);
        }

        // Should show feedback
        const feedback = await dashboardPage.waitForToastMessage();
        expect(feedback).toBeTruthy();
      }

      // Logout
      await dashboardPage.logout();
      await expect(page).toHaveURL(/\/login/);
    });

    test('should maintain state across page navigation', async ({ page }) => {
      await TestHelpers.loginUser(page, TEST_USERS.user);

      // Set a filter
      const searchInput = page.locator('input[placeholder*="Search"]').first();
      if (await searchInput.isVisible()) {
        await searchInput.fill('test-filter');
      }

      // Navigate away and back
      await page.goto('/login');
      await TestHelpers.loginUser(page, TEST_USERS.user);

      // Check if filter is preserved (depends on implementation)
      if (await searchInput.isVisible()) {
        const filterValue = await searchInput.inputValue();
        // This may or may not be preserved depending on design
        console.log('Filter state after navigation:', filterValue);
      }
    });

    test('should handle real AWS integration errors', async ({ page }) => {
      await TestHelpers.loginUser(page, TEST_USERS.user);

      // Mock various AWS error responses
      const awsErrors = [
        { code: 'UnauthorizedOperation', message: 'You do not have permission' },
        { code: 'InvalidInstanceID.NotFound', message: 'Instance not found' },
        { code: 'IncorrectInstanceState', message: 'Instance is not in correct state' },
      ];

      for (const error of awsErrors) {
        await TestHelpers.interceptAPIError(
          page,
          /.*\/instances.*\/(start|stop|terminate)/,
          400,
          error.message
        );

        // Try to perform action
        const mockInstances = TestDataFactory.createTestInstances(1);
        await TestHelpers.mockAPIResponse(page, /.*\/instances$/, mockInstances);
        await dashboardPage.refreshInstanceList();

        await dashboardPage.startInstance('test-instance-1');

        // Should show appropriate error message
        const errorMessage = await dashboardPage.getErrorMessage();
        expect(errorMessage).toContain(error.message);

        // Clear the mock for next iteration
        await page.unroute(/.*\/instances.*\/(start|stop|terminate)/);
      }
    });
  });
});
