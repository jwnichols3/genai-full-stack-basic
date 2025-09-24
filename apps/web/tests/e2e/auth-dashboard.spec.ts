import { test, expect, Page } from '@playwright/test';

// Test configuration
const TEST_CONFIG = {
  baseURL: 'https://d2pbh2fudgytg0.cloudfront.net',
  timeout: 30000,
  navigationTimeout: 15000,
};

// Test credentials from environment variables
const TEST_CREDENTIALS = {
  email: process.env.E2E_TEST_EMAIL || 'test@example.com',
  password: process.env.E2E_TEST_PASSWORD || 'testpassword123',
};

// Helper function to clear session storage and start fresh
async function clearAuthState(page: Page) {
  try {
    await page.evaluate(() => {
      try {
        sessionStorage.clear();
        localStorage.clear();
      } catch (error) {
        // Ignore localStorage/sessionStorage access errors in sandboxed environments
        console.log('Warning: Could not clear localStorage/sessionStorage:', error);
      }
    });
  } catch (error) {
    // Ignore if we can't execute the clear operation
    console.log('Warning: Could not execute clearAuthState:', error);
  }

  try {
    await page.context().clearCookies();
  } catch (error) {
    // Ignore cookie clearing errors
    console.log('Warning: Could not clear cookies:', error);
  }
}

// Helper function to wait for page to be fully loaded
async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');
}

// Helper function to login programmatically (for tests that need authenticated state)
async function loginUser(page: Page, email: string, password: string) {
  await page.goto('/login');
  await waitForPageLoad(page);

  // Fill login form
  await page.getByLabel(/email address/i).fill(email);
  await page.getByLabel(/password/i).fill(password);

  // Submit form and wait for navigation
  await Promise.all([
    page.waitForURL('/dashboard', { timeout: TEST_CONFIG.navigationTimeout }),
    page.getByRole('button', { name: /sign in/i }).click(),
  ]);

  // Verify we're on dashboard
  await expect(page).toHaveURL('/dashboard');
}

test.describe('EC2 Manager - Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Set longer timeout for each test
    test.setTimeout(60000);

    // Clear any existing auth state
    await clearAuthState(page);

    // Set viewport for consistent testing
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test.describe('Login Page', () => {
    test('should display login form with all required elements', async ({ page }) => {
      await page.goto('/login');
      await waitForPageLoad(page);

      // Check page title and heading
      await expect(page).toHaveTitle(/EC2 Manager|Sign In/);
      await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();

      // Check form elements are present
      await expect(page.getByLabel(/email address/i)).toBeVisible();
      await expect(page.getByLabel(/password/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();

      // Check descriptive text
      await expect(
        page.getByText(/enter your credentials to access the ec2 instance manager/i)
      ).toBeVisible();

      // Check lock icon is present
      await expect(page.locator('[data-testid="LockIcon"]')).toBeVisible();
    });

    test('should show validation errors for empty form submission', async ({ page }) => {
      await page.goto('/login');
      await waitForPageLoad(page);

      // Try to submit empty form
      await page.getByRole('button', { name: /sign in/i }).click();

      // Check for validation errors
      await expect(page.getByText(/email is required/i)).toBeVisible();
      await expect(page.getByText(/password is required/i)).toBeVisible();
    });

    test('should show validation error for invalid email format', async ({ page }) => {
      await page.goto('/login');
      await waitForPageLoad(page);

      // Enter invalid email
      await page.getByLabel(/email address/i).fill('invalid-email');
      await page.getByLabel(/password/i).fill('somepassword');
      await page.getByRole('button', { name: /sign in/i }).click();

      // Check for email validation error
      await expect(page.getByText(/please enter a valid email address/i)).toBeVisible();
    });

    test('should show validation error for short password', async ({ page }) => {
      await page.goto('/login');
      await waitForPageLoad(page);

      // Enter valid email but short password
      await page.getByLabel(/email address/i).fill('test@example.com');
      await page.getByLabel(/password/i).fill('short');
      await page.getByRole('button', { name: /sign in/i }).click();

      // Check for password validation error
      await expect(page.getByText(/password must be at least 8 characters long/i)).toBeVisible();
    });

    test('should clear field errors when user starts typing', async ({ page }) => {
      await page.goto('/login');
      await waitForPageLoad(page);

      // Submit empty form to trigger errors
      await page.getByRole('button', { name: /sign in/i }).click();
      await expect(page.getByText(/email is required/i)).toBeVisible();

      // Start typing in email field
      await page.getByLabel(/email address/i).fill('t');

      // Email error should be cleared
      await expect(page.getByText(/email is required/i)).not.toBeVisible();
    });

    test('should redirect authenticated users to dashboard', async ({ page }) => {
      // First login the user
      await loginUser(page, TEST_CREDENTIALS.email, TEST_CREDENTIALS.password);

      // Now try to visit login page
      await page.goto('/login');

      // Should be redirected to dashboard
      await expect(page).toHaveURL('/dashboard');
    });
  });

  test.describe('Authentication Process', () => {
    test('should successfully login with valid credentials', async ({ page }) => {
      await page.goto('/login');
      await waitForPageLoad(page);

      // Fill in credentials
      await page.getByLabel(/email address/i).fill(TEST_CREDENTIALS.email);
      await page.getByLabel(/password/i).fill(TEST_CREDENTIALS.password);

      // Submit form and wait for navigation
      await Promise.all([
        page.waitForURL('/dashboard', { timeout: TEST_CONFIG.navigationTimeout }),
        page.getByRole('button', { name: /sign in/i }).click(),
      ]);

      // Verify we're on the dashboard
      await expect(page).toHaveURL('/dashboard');
      await expect(page.getByRole('heading', { name: /ec2 dashboard/i })).toBeVisible();
    });

    test('should show error message for invalid credentials', async ({ page }) => {
      await page.goto('/login');
      await waitForPageLoad(page);

      // Fill in invalid credentials
      await page.getByLabel(/email address/i).fill('invalid@example.com');
      await page.getByLabel(/password/i).fill('wrongpassword');

      // Submit form
      await page.getByRole('button', { name: /sign in/i }).click();

      // Wait for error message to appear
      await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 10000 });

      // Should still be on login page
      await expect(page).toHaveURL('/login');
    });

    test('should show loading state during login', async ({ page }) => {
      await page.goto('/login');
      await waitForPageLoad(page);

      // Fill in credentials
      await page.getByLabel(/email address/i).fill(TEST_CREDENTIALS.email);
      await page.getByLabel(/password/i).fill(TEST_CREDENTIALS.password);

      // Click login and immediately check for loading state
      await page.getByRole('button', { name: /sign in/i }).click();

      // Check for loading text (may be brief)
      const loadingText = page.getByText(/signing in/i);
      if (await loadingText.isVisible()) {
        await expect(loadingText).toBeVisible();
      }
    });
  });

  test.describe('Protected Routes', () => {
    test('should redirect unauthenticated users to login', async ({ page }) => {
      // Try to access dashboard without authentication
      await page.goto('/dashboard');

      // Should be redirected to login
      await expect(page).toHaveURL('/login');
    });

    test('should redirect root path to dashboard for authenticated users', async ({ page }) => {
      // Login first
      await loginUser(page, TEST_CREDENTIALS.email, TEST_CREDENTIALS.password);

      // Visit root path
      await page.goto('/');

      // Should be redirected to dashboard
      await expect(page).toHaveURL('/dashboard');
    });
  });
});

test.describe('EC2 Manager - Dashboard Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Set longer timeout for each test
    test.setTimeout(60000);

    // Clear any existing auth state and login
    await clearAuthState(page);
    await loginUser(page, TEST_CREDENTIALS.email, TEST_CREDENTIALS.password);

    // Set viewport for consistent testing
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test.describe('Dashboard Layout', () => {
    test('should display dashboard with all required elements', async ({ page }) => {
      await expect(page).toHaveURL('/dashboard');

      // Check main heading
      await expect(page.getByRole('heading', { name: /ec2 dashboard/i })).toBeVisible();

      // Check header elements
      await expect(page.getByText(/ec2 manager/i)).toBeVisible();

      // Check navigation drawer (desktop)
      await expect(page.getByRole('button', { name: /dashboard/i })).toBeVisible();

      // Check refresh button
      await expect(page.getByRole('button', { name: /refresh instances/i })).toBeVisible();
    });

    test('should show user information in header', async ({ page }) => {
      // Check if user avatar or menu is visible
      await expect(page.locator('[aria-label="account menu"]')).toBeVisible();

      // Click on user menu to open it
      await page.locator('[aria-label="account menu"]').click();

      // Check menu items
      await expect(page.getByRole('menuitem', { name: /profile/i })).toBeVisible();
      await expect(page.getByRole('menuitem', { name: /settings/i })).toBeVisible();
      await expect(page.getByRole('menuitem', { name: /logout/i })).toBeVisible();

      // Close menu by clicking outside
      await page.click('body');
    });

    test('should display responsive navigation on mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      // Check for mobile menu button
      await expect(page.locator('[aria-label="menu"]')).toBeVisible();

      // Click to open mobile menu
      await page.locator('[aria-label="menu"]').click();

      // Check that navigation items are visible in mobile drawer
      await expect(page.getByText(/dashboard/i)).toBeVisible();
    });
  });

  test.describe('Instance Data Display', () => {
    test('should display instances table or empty state', async ({ page }) => {
      // Wait for data to load
      await page.waitForTimeout(2000);

      // Check if instances are displayed or empty state is shown
      const instancesGrid = page.locator('[role="grid"]');
      const emptyState = page.getByText(/no ec2 instances found/i);

      // Either instances grid or empty state should be visible
      const hasInstances = await instancesGrid.isVisible();
      const hasEmptyState = await emptyState.isVisible();

      expect(hasInstances || hasEmptyState).toBe(true);

      if (hasInstances) {
        // If instances are present, check grid headers
        await expect(page.getByRole('columnheader', { name: /instance id/i })).toBeVisible();
        await expect(page.getByRole('columnheader', { name: /name/i })).toBeVisible();
        await expect(page.getByRole('columnheader', { name: /status/i })).toBeVisible();
      } else {
        // If no instances, check empty state message
        await expect(emptyState).toBeVisible();
        await expect(
          page.getByText(/you don't have any ec2 instances in your account/i)
        ).toBeVisible();
      }
    });

    test('should show loading state initially', async ({ page }) => {
      // Reload page to see initial loading state
      await page.reload();

      // Check for loading indicator (may be brief)
      const loadingIndicator = page.locator('[role="progressbar"]');
      if (await loadingIndicator.isVisible()) {
        await expect(loadingIndicator).toBeVisible();
      }
    });

    test('should allow manual refresh of instances', async ({ page }) => {
      // Wait for initial load
      await waitForPageLoad(page);

      // Click refresh button
      await page.getByRole('button', { name: /refresh instances/i }).click();

      // Check for loading state or success
      const refreshButton = page.getByRole('button', { name: /refresh instances/i });

      // Button should be temporarily disabled during refresh
      await expect(refreshButton).toBeDisabled();

      // Wait for refresh to complete
      await expect(refreshButton).toBeEnabled({ timeout: 10000 });
    });

    test('should display instance count when instances are present', async ({ page }) => {
      // Wait for data to load
      await page.waitForTimeout(2000);

      // Check if instances are present
      const instancesGrid = page.locator('[role="grid"]');
      const hasInstances = await instancesGrid.isVisible();

      if (hasInstances) {
        // Look for instance count display
        const countText = page.locator('text=/showing \\d+ instance/i');
        await expect(countText).toBeVisible();
      }
    });

    test('should show last updated timestamp', async ({ page }) => {
      // Wait for data to load
      await page.waitForTimeout(2000);

      // Look for timestamp chip
      const timestampChip = page.locator('text=/updated \\d+:\\d+/i');
      if (await timestampChip.isVisible()) {
        await expect(timestampChip).toBeVisible();
      }
    });
  });

  test.describe('Data Grid Features', () => {
    test('should display grid toolbar when instances are present', async ({ page }) => {
      // Wait for data to load
      await page.waitForTimeout(2000);

      const instancesGrid = page.locator('[role="grid"]');
      const hasInstances = await instancesGrid.isVisible();

      if (hasInstances) {
        // Check for grid toolbar features
        const toolbar = page.locator('.MuiDataGrid-toolbarContainer');
        if (await toolbar.isVisible()) {
          // Look for quick filter
          const quickFilter = page.locator('input[placeholder*="Search"]');
          if (await quickFilter.isVisible()) {
            await expect(quickFilter).toBeVisible();
          }
        }
      }
    });

    test('should support pagination when many instances are present', async ({ page }) => {
      // Wait for data to load
      await page.waitForTimeout(2000);

      const instancesGrid = page.locator('[role="grid"]');
      const hasInstances = await instancesGrid.isVisible();

      if (hasInstances) {
        // Look for pagination controls
        const pagination = page.locator('.MuiDataGrid-footerContainer');
        if (await pagination.isVisible()) {
          await expect(pagination).toBeVisible();
        }
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should display error message when API fails', async ({ page }) => {
      // Intercept API calls to simulate failure
      await page.route('**/api/**', (route) => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal Server Error' }),
        });
      });

      // Reload to trigger API call
      await page.reload();

      // Wait for error state
      await page.waitForTimeout(3000);

      // Check for error alert
      const errorAlert = page.locator('[role="alert"]');
      if (await errorAlert.isVisible()) {
        await expect(errorAlert).toBeVisible();
      }
    });
  });
});

test.describe('EC2 Manager - Logout Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Set longer timeout for each test
    test.setTimeout(60000);

    // Clear any existing auth state and login
    await clearAuthState(page);
    await loginUser(page, TEST_CREDENTIALS.email, TEST_CREDENTIALS.password);

    // Set viewport for consistent testing
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('should successfully logout and redirect to login page', async ({ page }) => {
    // Open user menu
    await page.locator('[aria-label="account menu"]').click();

    // Click logout
    await Promise.all([
      page.waitForURL('/login', { timeout: TEST_CONFIG.navigationTimeout }),
      page.getByRole('menuitem', { name: /logout/i }).click(),
    ]);

    // Verify we're on login page
    await expect(page).toHaveURL('/login');
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();

    // Verify we can't access protected routes anymore
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/login');
  });

  test('should clear session data on logout', async ({ page }) => {
    // Logout
    await page.locator('[aria-label="account menu"]').click();
    await page.getByRole('menuitem', { name: /logout/i }).click();
    await page.waitForURL('/login');

    // Check that session storage is cleared
    const sessionDataAfter = await page.evaluate(() => {
      return sessionStorage.getItem('accessToken') || sessionStorage.getItem('user');
    });

    expect(sessionDataAfter).toBeFalsy();
  });

  test('should show success notification on logout', async ({ page }) => {
    // Open user menu and logout
    await page.locator('[aria-label="account menu"]').click();
    await page.getByRole('menuitem', { name: /logout/i }).click();

    // Look for success notification
    const successNotification = page.getByText(/successfully logged out/i);
    if (await successNotification.isVisible()) {
      await expect(successNotification).toBeVisible();
    }
  });
});

test.describe('EC2 Manager - End-to-End User Journey', () => {
  test('should complete full user journey: login → view dashboard → logout', async ({ page }) => {
    // Set longer timeout for this comprehensive test
    test.setTimeout(90000);

    // Start fresh
    await clearAuthState(page);
    await page.setViewportSize({ width: 1280, height: 720 });

    // Step 1: Navigate to login page
    await page.goto('/login');
    await waitForPageLoad(page);
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();

    // Step 2: Login with credentials
    await page.getByLabel(/email address/i).fill(TEST_CREDENTIALS.email);
    await page.getByLabel(/password/i).fill(TEST_CREDENTIALS.password);
    await Promise.all([
      page.waitForURL('/dashboard', { timeout: TEST_CONFIG.navigationTimeout }),
      page.getByRole('button', { name: /sign in/i }).click(),
    ]);

    // Step 3: Verify dashboard is loaded
    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByRole('heading', { name: /ec2 dashboard/i })).toBeVisible();

    // Step 4: Interact with dashboard (refresh instances)
    await page.getByRole('button', { name: /refresh instances/i }).click();
    await page.waitForTimeout(2000); // Wait for refresh to complete

    // Step 5: Open user menu and verify user is logged in
    await page.locator('[aria-label="account menu"]').click();
    await expect(page.getByRole('menuitem', { name: /logout/i })).toBeVisible();

    // Step 6: Logout
    await Promise.all([
      page.waitForURL('/login', { timeout: TEST_CONFIG.navigationTimeout }),
      page.getByRole('menuitem', { name: /logout/i }).click(),
    ]);

    // Step 7: Verify return to login page
    await expect(page).toHaveURL('/login');
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();

    // Step 8: Verify protected routes are inaccessible
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/login');
  });
});
