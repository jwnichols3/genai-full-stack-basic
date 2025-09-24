import { test, expect } from '@playwright/test';
import { LoginPage } from '../helpers/page-objects/LoginPage';
import { DashboardPage } from '../helpers/page-objects/DashboardPage';
import { TestHelpers, TEST_USERS } from '../helpers/utilities/test-helpers';
import { TestDataFactory } from '../helpers/test-data/test-data-factory';

test.describe('Error Handling Flow Tests', () => {
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
    await TestHelpers.clearAuthState(page);
  });

  test.describe('Network Error Scenarios', () => {
    test('should handle network connectivity failures gracefully', async ({ page }) => {
      await TestHelpers.loginUser(page, TEST_USERS.user);

      // Simulate network failure
      await TestHelpers.simulateOffline(page);

      // Try to perform action
      await dashboardPage.refreshInstanceList();

      // Should show network error message
      const errorMessage = await dashboardPage.getErrorMessage();
      expect(errorMessage?.toLowerCase()).toMatch(/network|connection|offline|unavailable/);

      // Should have retry option
      const retryButton = page.locator('button:has-text("Retry"), button:has-text("Try Again")');
      await expect(retryButton).toBeVisible();
    });

    test('should handle API timeout scenarios', async ({ page }) => {
      await TestHelpers.loginUser(page, TEST_USERS.user);

      // Mock slow API response
      await page.route(/.*\/instances/, async (route) => {
        await page.waitForTimeout(15000); // Longer than timeout
        await route.fulfill({ status: 200, body: '[]' });
      });

      // Try to load instances
      await dashboardPage.refreshInstanceList();

      // Should show timeout error
      const errorMessage = await dashboardPage.getErrorMessage();
      expect(errorMessage?.toLowerCase()).toMatch(/timeout|slow|taking too long/);
    });

    test('should show retry functionality for failed requests', async ({ page }) => {
      await TestHelpers.loginUser(page, TEST_USERS.user);

      let attemptCount = 0;
      await page.route(/.*\/instances/, async (route) => {
        attemptCount++;
        if (attemptCount < 3) {
          await route.fulfill({ status: 500, body: '{"error": "Server error"}' });
        } else {
          await route.fulfill({ status: 200, body: '[]' });
        }
      });

      // Initial request should fail
      await dashboardPage.refreshInstanceList();

      // Should show error and retry button
      const retryButton = page.locator('button:has-text("Retry")');
      await expect(retryButton).toBeVisible();

      // Click retry
      await retryButton.click();

      // Should eventually succeed
      await dashboardPage.waitForLoadingToComplete();
      expect(attemptCount).toBeGreaterThan(1);
    });

    test('should handle intermittent connectivity issues', async ({ page }) => {
      await TestHelpers.loginUser(page, TEST_USERS.user);

      // Simulate intermittent connectivity
      let isOnline = true;
      setInterval(() => {
        isOnline = !isOnline;
      }, 2000);

      await page.route(/.*\/instances/, async (route) => {
        if (isOnline) {
          await route.fulfill({ status: 200, body: '[]' });
        } else {
          await route.abort('failed');
        }
      });

      // Should handle on/off connectivity
      await dashboardPage.refreshInstanceList();

      // Should show appropriate status
      const hasError = await dashboardPage.getErrorMessage();
      const hasLoading = await page.locator('.MuiCircularProgress-root').isVisible();

      // Should either show error or be loading
      expect(hasError || hasLoading).toBeTruthy();
    });
  });

  test.describe('Authentication Error Scenarios', () => {
    test('should handle 401 authentication errors with login redirect', async ({ page }) => {
      await TestHelpers.loginUser(page, TEST_USERS.user);

      // Mock 401 response
      await TestHelpers.interceptAPIError(page, /.*\/instances/, 401, 'Authentication required');

      // Try to load dashboard
      await dashboardPage.refreshInstanceList();

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);

      // Should show appropriate message
      const errorMessage = await loginPage.getErrorMessage();
      expect(errorMessage?.toLowerCase()).toMatch(/session|login|expired|authentication/);
    });

    test('should handle token expiration gracefully', async ({ page }) => {
      await TestHelpers.loginUser(page, TEST_USERS.user);

      // Mock expired token
      await page.evaluate(() => {
        localStorage.setItem('authToken', 'expired.token.here');
      });

      // Try to perform action
      await dashboardPage.refreshInstanceList();

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);

      // Should clear expired token
      const token = await page.evaluate(() => localStorage.getItem('authToken'));
      expect(token).toBeNull();
    });

    test('should handle invalid token format', async ({ page }) => {
      await TestHelpers.loginUser(page, TEST_USERS.user);

      // Set invalid token
      await page.evaluate(() => {
        localStorage.setItem('authToken', 'invalid-token-format');
      });

      // Try to perform action
      await dashboardPage.refreshInstanceList();

      // Should handle gracefully
      const hasError = await dashboardPage.getErrorMessage();
      const isOnLogin = page.url().includes('/login');

      expect(hasError || isOnLogin).toBeTruthy();
    });

    test('should handle concurrent session invalidation', async ({ page, context }) => {
      await TestHelpers.loginUser(page, TEST_USERS.user);

      // Open second tab
      const page2 = await context.newPage();
      const dashboardPage2 = new DashboardPage(page2);
      await TestHelpers.loginUser(page2, TEST_USERS.user);

      // Logout from second tab
      await dashboardPage2.logout();

      // Try to use first tab
      await dashboardPage.refreshInstanceList();

      // Depending on session management, should handle appropriately
      const errorMessage = await dashboardPage.getErrorMessage();
      const isOnLogin = page.url().includes('/login');

      // Should either show error or redirect to login
      expect(errorMessage || isOnLogin).toBeTruthy();
    });
  });

  test.describe('Authorization Error Scenarios', () => {
    test('should handle 403 authorization errors with role-specific messaging', async ({
      page,
    }) => {
      await TestHelpers.loginUser(page, TEST_USERS.user);

      // Mock 403 response
      await TestHelpers.interceptAPIError(
        page,
        /.*\/instances.*\/terminate/,
        403,
        'Insufficient permissions'
      );

      // Try to terminate instance
      const mockInstances = TestDataFactory.createTestInstances(1);
      await TestHelpers.mockAPIResponse(page, /.*\/instances$/, mockInstances);
      await dashboardPage.refreshInstanceList();

      await dashboardPage.terminateInstance('test-instance-1');

      // Should show permission error
      const errorMessage = await dashboardPage.getErrorMessage();
      expect(errorMessage?.toLowerCase()).toMatch(/permission|access|denied|insufficient/);
    });

    test('should disable unauthorized actions in UI', async ({ page }) => {
      await TestHelpers.loginUser(page, TEST_USERS.user);

      // Mock user with limited permissions
      await page.evaluate(() => {
        localStorage.setItem('userRole', 'readonly');
        localStorage.setItem('permissions', JSON.stringify(['read:instances']));
      });

      const mockInstances = TestDataFactory.createTestInstances(1);
      await TestHelpers.mockAPIResponse(page, /.*\/instances/, mockInstances);
      await dashboardPage.refreshInstanceList();

      // Action buttons should be disabled
      const canStart = await dashboardPage.isActionButtonEnabled('test-instance-1', 'start');
      const canStop = await dashboardPage.isActionButtonEnabled('test-instance-1', 'stop');
      const canTerminate = await dashboardPage.isActionButtonEnabled(
        'test-instance-1',
        'terminate'
      );

      expect(canStart).toBeFalsy();
      expect(canStop).toBeFalsy();
      expect(canTerminate).toBeFalsy();
    });

    test('should show helpful messaging for insufficient privileges', async ({ page }) => {
      await TestHelpers.loginUser(page, TEST_USERS.user);

      // Mock 403 with specific message
      await TestHelpers.interceptAPIError(
        page,
        /.*\/instances.*\/start/,
        403,
        'User role "readonly" cannot perform instance actions'
      );

      const mockInstances = TestDataFactory.createTestInstances(1, { state: 'stopped' });
      await TestHelpers.mockAPIResponse(page, /.*\/instances$/, mockInstances);
      await dashboardPage.refreshInstanceList();

      await dashboardPage.startInstance('test-instance-1');

      // Should show specific role-based error
      const errorMessage = await dashboardPage.getErrorMessage();
      expect(errorMessage).toContain('readonly');
      expect(errorMessage).toContain('cannot perform');
    });
  });

  test.describe('Client Error Scenarios', () => {
    test('should handle 404 not found scenarios', async ({ page }) => {
      await TestHelpers.loginUser(page, TEST_USERS.user);

      // Mock 404 response
      await TestHelpers.interceptAPIError(
        page,
        /.*\/instances\/i-nonexistent/,
        404,
        'Instance not found'
      );

      // Try to perform action on non-existent instance
      await page.route(/.*\/instances$/, async (route) => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify([TestDataFactory.createTestInstance({ instanceId: 'i-exists' })]),
        });
      });

      await dashboardPage.refreshInstanceList();

      // Mock action on non-existent instance
      await page.evaluate(() => {
        // Simulate clicking action that references non-existent instance
        fetch('/api/instances/i-nonexistent/start', { method: 'POST' });
      });

      // Should show not found error
      const errorMessage = await dashboardPage.getErrorMessage();
      expect(errorMessage?.toLowerCase()).toMatch(/not found|does not exist/);
    });

    test('should handle 429 rate limiting with retry countdown', async ({ page }) => {
      await TestHelpers.loginUser(page, TEST_USERS.user);

      // Mock rate limiting
      await TestHelpers.interceptAPIError(
        page,
        /.*\/instances/,
        429,
        'Too many requests. Try again in 60 seconds'
      );

      // Try to load instances
      await dashboardPage.refreshInstanceList();

      // Should show rate limit error
      const errorMessage = await dashboardPage.getErrorMessage();
      expect(errorMessage?.toLowerCase()).toMatch(/too many|rate limit|try again/);

      // Should show countdown timer if implemented
      const countdown = page.locator('[data-testid="retry-countdown"]');
      if (await countdown.isVisible()) {
        const countdownText = await countdown.textContent();
        expect(countdownText).toMatch(/\d+/); // Should contain numbers
      }
    });

    test('should handle malformed API responses', async ({ page }) => {
      await TestHelpers.loginUser(page, TEST_USERS.user);

      // Mock invalid JSON response
      await page.route(/.*\/instances/, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: 'invalid json {',
        });
      });

      // Try to load instances
      await dashboardPage.refreshInstanceList();

      // Should handle parsing error gracefully
      const errorMessage = await dashboardPage.getErrorMessage();
      expect(errorMessage?.toLowerCase()).toMatch(/error|failed|invalid/);
    });
  });

  test.describe('Server Error Scenarios', () => {
    test('should handle 500 server errors with support information', async ({ page }) => {
      await TestHelpers.loginUser(page, TEST_USERS.user);

      // Mock 500 error
      await TestHelpers.interceptAPIError(page, /.*\/instances/, 500, 'Internal server error');

      // Try to load instances
      await dashboardPage.refreshInstanceList();

      // Should show server error
      const errorMessage = await dashboardPage.getErrorMessage();
      expect(errorMessage?.toLowerCase()).toMatch(
        /server error|internal error|something went wrong/
      );

      // Should provide support contact information
      const supportInfo = page.locator('[data-testid="support-info"], .support-contact');
      if (await supportInfo.isVisible()) {
        const supportText = await supportInfo.textContent();
        expect(supportText).toMatch(/support|contact|help/);
      }
    });

    test('should handle 502 bad gateway errors', async ({ page }) => {
      await TestHelpers.loginUser(page, TEST_USERS.user);

      // Mock 502 error
      await TestHelpers.interceptAPIError(page, /.*\/instances/, 502, 'Bad Gateway');

      // Try to load instances
      await dashboardPage.refreshInstanceList();

      // Should show appropriate error message
      const errorMessage = await dashboardPage.getErrorMessage();
      expect(errorMessage?.toLowerCase()).toMatch(/service unavailable|temporary|try again/);
    });

    test('should handle 503 service unavailable', async ({ page }) => {
      await TestHelpers.loginUser(page, TEST_USERS.user);

      // Mock 503 error
      await TestHelpers.interceptAPIError(
        page,
        /.*\/instances/,
        503,
        'Service temporarily unavailable'
      );

      // Try to load instances
      await dashboardPage.refreshInstanceList();

      // Should show maintenance message
      const errorMessage = await dashboardPage.getErrorMessage();
      expect(errorMessage?.toLowerCase()).toMatch(/unavailable|maintenance|temporary/);
    });
  });

  test.describe('React Error Boundary', () => {
    test('should catch and display React errors gracefully', async ({ page }) => {
      await TestHelpers.loginUser(page, TEST_USERS.user);

      // Mock component error by injecting bad data
      await TestHelpers.mockAPIResponse(page, /.*\/instances/, {
        instances: null, // This might cause a React error
        badData: undefined,
      });

      // Try to load instances
      await dashboardPage.refreshInstanceList();

      // Should either show error boundary or handle gracefully
      const errorBoundary = page.locator('[data-testid="error-boundary"]');
      const hasError = await dashboardPage.getErrorMessage();

      // Should not crash the application
      expect(await page.title()).toBeTruthy();

      if (await errorBoundary.isVisible()) {
        // Should have recovery option
        const reloadButton = errorBoundary.locator('button:has-text("Reload")');
        await expect(reloadButton).toBeVisible();
      }
    });

    test('should provide recovery options after React errors', async ({ page }) => {
      await TestHelpers.loginUser(page, TEST_USERS.user);

      // Trigger a React error (implementation specific)
      await page.evaluate(() => {
        // This would trigger an error in a real React component
        throw new Error('Simulated React component error');
      });

      // Look for error boundary recovery
      const errorBoundary = page.locator('[data-testid="error-boundary"], .error-boundary');

      if (await errorBoundary.isVisible()) {
        // Should have reload option
        const reloadButton = errorBoundary.locator(
          'button:has-text("Reload"), button:has-text("Try Again")'
        );
        await reloadButton.click();

        // Should recover
        await dashboardPage.waitForDashboardToLoad();
      }
    });
  });

  test.describe('Toast Notification Behavior', () => {
    test('should display error toasts for failed operations', async ({ page }) => {
      await TestHelpers.loginUser(page, TEST_USERS.user);

      // Mock failure for instance action
      await TestHelpers.interceptAPIError(
        page,
        /.*\/instances.*\/start/,
        400,
        'Cannot start instance'
      );

      const mockInstances = TestDataFactory.createTestInstances(1, { state: 'stopped' });
      await TestHelpers.mockAPIResponse(page, /.*\/instances$/, mockInstances);
      await dashboardPage.refreshInstanceList();

      await dashboardPage.startInstance('test-instance-1');

      // Should show error toast
      const toast = await dashboardPage.waitForToastMessage();
      expect(toast).toContain('Cannot start');
    });

    test('should queue multiple error toasts appropriately', async ({ page }) => {
      await TestHelpers.loginUser(page, TEST_USERS.user);

      // Mock multiple failures
      await TestHelpers.interceptAPIError(page, /.*\/instances.*\/start/, 400, 'Start failed');
      await TestHelpers.interceptAPIError(page, /.*\/instances.*\/stop/, 400, 'Stop failed');

      const mockInstances = TestDataFactory.createTestInstances(2);
      await TestHelpers.mockAPIResponse(page, /.*\/instances$/, mockInstances);
      await dashboardPage.refreshInstanceList();

      // Trigger multiple errors quickly
      await dashboardPage.startInstance('test-instance-1');
      await dashboardPage.stopInstance('test-instance-2');

      // Should handle multiple toasts
      const toasts = page.locator('.MuiSnackbar-root');
      const toastCount = await toasts.count();
      expect(toastCount).toBeGreaterThan(0);
    });

    test('should allow dismissing error toasts', async ({ page }) => {
      await TestHelpers.loginUser(page, TEST_USERS.user);

      // Mock error
      await TestHelpers.interceptAPIError(page, /.*\/instances/, 500, 'Server error');

      await dashboardPage.refreshInstanceList();

      // Should show error toast
      const toast = await dashboardPage.waitForToastMessage();
      expect(toast).toBeTruthy();

      // Should be able to dismiss
      await TestHelpers.dismissToast(page);

      // Toast should be gone
      const toastVisible = await page.locator('.MuiSnackbar-root').isVisible();
      expect(toastVisible).toBeFalsy();
    });
  });

  test.describe('Error Recovery', () => {
    test('should allow manual refresh after errors', async ({ page }) => {
      await TestHelpers.loginUser(page, TEST_USERS.user);

      // Mock initial error
      let shouldFail = true;
      await page.route(/.*\/instances/, async (route) => {
        if (shouldFail) {
          shouldFail = false;
          await route.fulfill({ status: 500, body: '{"error": "Server error"}' });
        } else {
          await route.fulfill({ status: 200, body: '[]' });
        }
      });

      // Initial load should fail
      await dashboardPage.refreshInstanceList();
      const errorMessage = await dashboardPage.getErrorMessage();
      expect(errorMessage).toBeTruthy();

      // Manual refresh should succeed
      await dashboardPage.refreshInstanceList();
      await dashboardPage.waitForLoadingToComplete();

      // Error should be cleared
      const newError = await dashboardPage.getErrorMessage();
      expect(newError).toBeNull();
    });

    test('should maintain user context during error recovery', async ({ page }) => {
      await TestHelpers.loginUser(page, TEST_USERS.user);

      // Mock temporary error
      await TestHelpers.interceptAPIError(page, /.*\/instances/, 500, 'Temporary error');

      await dashboardPage.refreshInstanceList();

      // Should still be logged in
      const isLoggedIn = await dashboardPage.isLoggedIn();
      expect(isLoggedIn).toBeTruthy();

      // Should maintain URL
      expect(page.url()).toContain('/dashboard');
    });

    test('should preserve user inputs after recoverable errors', async ({ page }) => {
      await TestHelpers.loginUser(page, TEST_USERS.user);

      // Fill in search filter
      await dashboardPage.filterInstances('my-instance');

      // Mock temporary error
      await TestHelpers.interceptAPIError(page, /.*\/instances/, 500, 'Temporary error');

      await dashboardPage.refreshInstanceList();

      // Should preserve filter value
      const filterInput = page.locator(
        'input[placeholder*="Search"], input[placeholder*="Filter"]'
      );
      if (await filterInput.isVisible()) {
        const value = await filterInput.inputValue();
        expect(value).toBe('my-instance');
      }
    });
  });
});
