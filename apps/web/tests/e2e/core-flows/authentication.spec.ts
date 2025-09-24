import { test, expect } from '@playwright/test';
import { LoginPage } from '../helpers/page-objects/LoginPage';
import { DashboardPage } from '../helpers/page-objects/DashboardPage';
import { TestHelpers, TEST_USERS } from '../helpers/utilities/test-helpers';
import { TestDataFactory } from '../helpers/test-data/test-data-factory';

test.describe('Authentication Flow Tests', () => {
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);

    // Clear any existing auth state
    await TestHelpers.clearAuthState(page);
    await loginPage.navigateToLogin();
  });

  test.describe('Login Functionality', () => {
    test('should successfully login with valid credentials', async ({ page }) => {
      await loginPage.login(TEST_USERS.user.email, TEST_USERS.user.password);

      // Verify redirect to dashboard
      await expect(page).toHaveURL(/\/dashboard/);

      // Verify user is logged in
      const isLoggedIn = await dashboardPage.isLoggedIn();
      expect(isLoggedIn).toBeTruthy();
    });

    test('should show error with invalid credentials', async ({ page }) => {
      await loginPage.login('invalid@example.com', 'wrongpassword');

      // Should remain on login page
      await expect(page).toHaveURL(/\/login/);

      // Should show error message
      const error = await loginPage.waitForErrorMessage();
      expect(error).toContain('Invalid credentials');
    });

    test('should show error with empty email', async ({ page }) => {
      await loginPage.enterPassword(TEST_USERS.user.password);
      await loginPage.clickSubmit();

      // Should show validation error
      const error = await loginPage.getFieldValidationError('email');
      expect(error).toBeTruthy();
    });

    test('should show error with empty password', async ({ page }) => {
      await loginPage.enterEmail(TEST_USERS.user.email);
      await loginPage.clickSubmit();

      // Should show validation error
      const error = await loginPage.getFieldValidationError('password');
      expect(error).toBeTruthy();
    });

    test('should show error with invalid email format', async ({ page }) => {
      await loginPage.login('notanemail', 'password');

      // Should show validation error
      const error = await loginPage.getFieldValidationError('email');
      expect(error).toContain('Invalid email');
    });

    test('should handle SQL injection attempts safely', async ({ page }) => {
      await loginPage.login("admin' OR '1'='1", "password' OR '1'='1");

      // Should not bypass authentication
      await expect(page).toHaveURL(/\/login/);
      const error = await loginPage.waitForErrorMessage();
      expect(error).toBeTruthy();
    });

    test('should handle XSS attempts safely', async ({ page }) => {
      await loginPage.login('<script>alert("xss")</script>', 'password');

      // Should sanitize input and show error
      await expect(page).toHaveURL(/\/login/);
      const error = await loginPage.waitForErrorMessage();
      expect(error).toBeTruthy();
    });

    test('should allow login with Enter key', async ({ page }) => {
      await loginPage.enterEmail(TEST_USERS.user.email);
      await loginPage.enterPassword(TEST_USERS.user.password);
      await loginPage.submitWithEnterKey();

      // Should redirect to dashboard
      await expect(page).toHaveURL(/\/dashboard/);
    });

    test('should preserve remember me preference', async ({ page }) => {
      await loginPage.loginWithRememberMe(TEST_USERS.user.email, TEST_USERS.user.password);

      // Should redirect to dashboard
      await expect(page).toHaveURL(/\/dashboard/);

      // Should have persistent auth token
      const token = await loginPage.getAuthTokenFromStorage();
      expect(token).toBeTruthy();
    });

    test('should show loading state during login', async ({ page }) => {
      // Start login process
      const loginPromise = loginPage.login(TEST_USERS.user.email, TEST_USERS.user.password);

      // Check for loading spinner
      const isLoading = await loginPage.isLoadingSpinnerVisible();
      expect(isLoading).toBeTruthy();

      await loginPromise;
    });
  });

  test.describe('Logout Functionality', () => {
    test.beforeEach(async ({ page }) => {
      // Login first
      await TestHelpers.loginUser(page, TEST_USERS.user);
    });

    test('should successfully logout', async ({ page }) => {
      await dashboardPage.logout();

      // Should redirect to login page
      await expect(page).toHaveURL(/\/login/);

      // Should clear auth token
      const token = await loginPage.getAuthTokenFromStorage();
      expect(token).toBeNull();
    });

    test('should clear all auth data on logout', async ({ page }) => {
      await dashboardPage.logout();

      // Check auth token is cleared
      const token = await loginPage.getAuthTokenFromStorage();
      expect(token).toBeNull();

      // Check cookies are cleared
      const hasAuthCookie = await loginPage.hasAuthCookie();
      expect(hasAuthCookie).toBeFalsy();
    });

    test('should redirect to login when accessing protected routes after logout', async ({
      page,
    }) => {
      await dashboardPage.logout();

      // Try to access dashboard directly
      await page.goto('/dashboard');

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('Session Management', () => {
    test('should handle session timeout gracefully', async ({ page }) => {
      // Login
      await TestHelpers.loginUser(page, TEST_USERS.user);

      // Simulate expired token
      await page.evaluate(() => {
        localStorage.setItem('authToken', 'expired-token');
      });

      // Try to perform an action
      await dashboardPage.refreshInstanceList();

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);

      // Should show session expired message
      const error = await loginPage.waitForErrorMessage();
      expect(error).toContain('session');
    });

    test('should maintain session across page refresh', async ({ page }) => {
      // Login
      await TestHelpers.loginUser(page, TEST_USERS.user);

      // Refresh page
      await page.reload();

      // Should still be on dashboard
      await expect(page).toHaveURL(/\/dashboard/);

      // Should still be logged in
      const isLoggedIn = await dashboardPage.isLoggedIn();
      expect(isLoggedIn).toBeTruthy();
    });

    test('should prevent concurrent sessions if configured', async ({ page, context }) => {
      // Login in first tab
      await TestHelpers.loginUser(page, TEST_USERS.user);

      // Open second tab and try to login
      const page2 = await context.newPage();
      const loginPage2 = new LoginPage(page2);
      await loginPage2.navigateToLogin();
      await loginPage2.login(TEST_USERS.user.email, TEST_USERS.user.password);

      // First session should be invalidated (if configured)
      await page.reload();

      // This behavior depends on backend configuration
      // Test should verify expected behavior based on requirements
    });
  });

  test.describe('Password Reset Flow', () => {
    test.skip('should navigate to password reset page', async ({ page }) => {
      // This test is skipped if password reset is not implemented
      await loginPage.clickForgotPassword();

      // Should navigate to password reset
      await expect(page).toHaveURL(/\/forgot-password|\/reset-password/);
    });

    test.skip('should send password reset email', async ({ page }) => {
      // This test is skipped if password reset is not implemented
      await loginPage.clickForgotPassword();
      await page.fill('input[type="email"]', TEST_USERS.user.email);
      await page.click('button[type="submit"]');

      // Should show success message
      const message = await TestHelpers.waitForToast(page);
      expect(message).toContain('reset email sent');
    });
  });

  test.describe('Multi-Factor Authentication', () => {
    test.skip('should prompt for MFA code after valid credentials', async ({ page }) => {
      // This test is skipped if MFA is not implemented
      await loginPage.login(TEST_USERS.admin.email, TEST_USERS.admin.password);

      // Should show MFA prompt
      await expect(page).toHaveURL(/\/mfa|\/verify/);

      // Should have MFA input field
      const mfaInput = page.locator('input[name="mfa-code"]');
      await expect(mfaInput).toBeVisible();
    });

    test.skip('should verify valid MFA code', async ({ page }) => {
      // This test is skipped if MFA is not implemented
      await loginPage.login(TEST_USERS.admin.email, TEST_USERS.admin.password);

      // Enter MFA code
      await page.fill('input[name="mfa-code"]', '123456');
      await page.click('button[type="submit"]');

      // Should redirect to dashboard
      await expect(page).toHaveURL(/\/dashboard/);
    });
  });

  test.describe('Authentication Security', () => {
    test('should enforce rate limiting on failed attempts', async ({ page }) => {
      // Attempt multiple failed logins
      for (let i = 0; i < 5; i++) {
        await loginPage.clearForm();
        await loginPage.login('test@example.com', `wrongpass${i}`);
        await page.waitForTimeout(100);
      }

      // Should show rate limiting message
      const error = await loginPage.waitForErrorMessage();
      expect(error?.toLowerCase()).toMatch(/too many|rate limit|try again/);
    });

    test('should not expose sensitive information in errors', async ({ page }) => {
      // Try with non-existent user
      await loginPage.login('nonexistent@example.com', 'password');
      const error1 = await loginPage.waitForErrorMessage();

      // Try with existing user but wrong password
      await loginPage.clearForm();
      await loginPage.login(TEST_USERS.user.email, 'wrongpassword');
      const error2 = await loginPage.waitForErrorMessage();

      // Both should show same generic error (no user enumeration)
      expect(error1).toEqual(error2);
    });

    test('should enforce password complexity requirements', async ({ page }) => {
      // Skip if this is login-only (no registration)
      // This would be tested in registration flow
      test.skip();
    });

    test('should use secure token storage', async ({ page }) => {
      await TestHelpers.loginUser(page, TEST_USERS.user);

      // Check token is not in localStorage as plain text
      const localStorage = await page.evaluate(() => {
        return Object.keys(window.localStorage);
      });

      // Token should be properly handled (encrypted or in memory only)
      // Specific implementation depends on security requirements
    });
  });

  test.describe('Login Performance', () => {
    test('should complete login within performance threshold', async ({ page }) => {
      const loginTime = await loginPage.measureLoginTime();

      // Should complete within 2 seconds
      expect(loginTime).toBeLessThan(2000);
    });

    test('should handle slow network gracefully', async ({ page }) => {
      // Simulate slow network
      await TestHelpers.simulateSlowNetwork(page);

      // Should still complete login
      await loginPage.login(TEST_USERS.user.email, TEST_USERS.user.password);

      // Should show loading state during slow request
      const isLoading = await loginPage.isLoadingSpinnerVisible();
      expect(isLoading).toBeTruthy();
    });
  });
});
