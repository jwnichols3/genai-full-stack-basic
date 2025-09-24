import { Page } from '@playwright/test';

export interface TestUser {
  email: string;
  password: string;
  role?: string;
}

export const TEST_USERS = {
  admin: {
    email: 'admin@ec2manager.com',
    password: 'AdminPass123!',
    role: 'admin',
  },
  user: {
    email: 'admin@ec2manager.com', // Using the actual seeded user
    password: 'AdminPass123!',
    role: 'user',
  },
  testUser: {
    email: 'admin@ec2manager.com', // Using the actual seeded user
    password: 'AdminPass123!',
    role: 'user',
  },
};

export class TestHelpers {
  static async loginUser(page: Page, user: TestUser): Promise<void> {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.fill('input[type="email"], input[name="email"]', user.email);
    await page.fill('input[type="password"], input[name="password"]', user.password);
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
  }

  static async logout(page: Page): Promise<void> {
    // Try to find and click user menu first
    const userMenu = page.locator('[data-testid="user-menu"], .user-menu');
    if (await userMenu.isVisible()) {
      await userMenu.click();
    }

    await page.click('button:has-text("Logout"), button:has-text("Sign Out")');
    await page.waitForURL(/\/login/, { timeout: 5000 });
  }

  static async clearAuthState(page: Page): Promise<void> {
    try {
      await page.evaluate(() => {
        try {
          localStorage.clear();
          sessionStorage.clear();
        } catch (error) {
          // Ignore localStorage access errors (e.g., in sandboxed environments)
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

  static async waitForPageLoad(page: Page): Promise<void> {
    await page.waitForLoadState('networkidle');
    // Wait for any loading spinners to disappear
    const spinner = page.locator('.MuiCircularProgress-root, [role="progressbar"]');
    await spinner.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {
      // Spinner may not appear at all
    });
  }

  static async waitForToast(page: Page, timeout: number = 5000): Promise<string | null> {
    const toast = page.locator('.MuiSnackbar-root, [role="alert"]');
    try {
      await toast.waitFor({ state: 'visible', timeout });
      const message = await toast.textContent();
      return message;
    } catch {
      return null;
    }
  }

  static async dismissToast(page: Page): Promise<void> {
    const closeButton = page.locator('.MuiSnackbar-root button, [role="alert"] button');
    if (await closeButton.isVisible()) {
      await closeButton.click();
      await closeButton.waitFor({ state: 'hidden' });
    }
  }

  static async interceptAPIError(
    page: Page,
    urlPattern: string | RegExp,
    errorCode: number,
    errorMessage?: string
  ): Promise<void> {
    await page.route(urlPattern, async (route) => {
      await route.fulfill({
        status: errorCode,
        contentType: 'application/json',
        body: JSON.stringify({
          error: errorMessage || `Error ${errorCode}`,
          message: errorMessage || `Request failed with status ${errorCode}`,
        }),
      });
    });
  }

  static async mockAPIResponse(
    page: Page,
    urlPattern: string | RegExp,
    response: any
  ): Promise<void> {
    await page.route(urlPattern, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response),
      });
    });
  }

  static async waitForAPICall(
    page: Page,
    urlPattern: string | RegExp,
    timeout: number = 10000
  ): Promise<any> {
    const response = await page.waitForResponse(
      (resp) => {
        const url = resp.url();
        if (typeof urlPattern === 'string') {
          return url.includes(urlPattern);
        }
        return urlPattern.test(url);
      },
      { timeout }
    );
    return {
      status: response.status(),
      data: await response.json().catch(() => null),
      headers: response.headers(),
    };
  }

  static async measurePerformance(_page: Page, action: () => Promise<void>): Promise<number> {
    const startTime = Date.now();
    await action();
    return Date.now() - startTime;
  }

  static async checkPagePerformance(page: Page): Promise<any> {
    return await page.evaluate(() => {
      const perfData = window.performance.timing;
      return {
        loadTime: perfData.loadEventEnd - perfData.navigationStart,
        domContentLoaded: perfData.domContentLoadedEventEnd - perfData.navigationStart,
        responseTime: perfData.responseEnd - perfData.requestStart,
        renderTime: perfData.domComplete - perfData.domLoading,
      };
    });
  }

  static async getMemoryUsage(page: Page): Promise<any> {
    return await page.evaluate(() => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        return {
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
        };
      }
      return null;
    });
  }

  static async checkForConsoleErrors(page: Page): Promise<string[]> {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    return errors;
  }

  static async checkForNetworkErrors(page: Page): Promise<any[]> {
    const failedRequests: any[] = [];
    page.on('requestfailed', (request) => {
      failedRequests.push({
        url: request.url(),
        method: request.method(),
        failure: request.failure(),
      });
    });
    return failedRequests;
  }

  static async simulateSlowNetwork(page: Page): Promise<void> {
    await page.context().setOffline(false);
    await page.context().route('**/*', async (route: any) => {
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Add 2 second delay
      await route.continue();
    });
  }

  static async simulateOffline(page: Page): Promise<void> {
    await page.context().setOffline(true);
  }

  static async simulateOnline(page: Page): Promise<void> {
    await page.context().setOffline(false);
  }

  static async takeScreenshot(page: Page, name: string): Promise<void> {
    await page.screenshot({
      path: `test-results/screenshots/${name}.png`,
      fullPage: true,
    });
  }

  static async checkAccessibility(page: Page): Promise<any> {
    // This will be implemented with axe-core
    // For now, return basic checks
    const issues: any[] = [];

    // Check for alt text on images
    const imagesWithoutAlt = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img'));
      return images.filter((img) => !img.alt).length;
    });

    if (imagesWithoutAlt > 0) {
      issues.push({
        type: 'error',
        description: `${imagesWithoutAlt} images without alt text`,
      });
    }

    // Check for form labels
    const inputsWithoutLabels = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input, select, textarea'));
      return inputs.filter((input) => {
        const id = input.id;
        if (!id) return true;
        const label = document.querySelector(`label[for="${id}"]`);
        return !label;
      }).length;
    });

    if (inputsWithoutLabels > 0) {
      issues.push({
        type: 'warning',
        description: `${inputsWithoutLabels} form inputs without labels`,
      });
    }

    return issues;
  }

  static async checkForBrokenLinks(page: Page): Promise<string[]> {
    const brokenLinks: string[] = [];
    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href]')).map(
        (a) => (a as HTMLAnchorElement).href
      );
    });

    for (const link of links) {
      try {
        const response = await page.request.get(link);
        if (response.status() >= 400) {
          brokenLinks.push(`${link} (${response.status()})`);
        }
      } catch (error) {
        brokenLinks.push(`${link} (unreachable)`);
      }
    }

    return brokenLinks;
  }

  static async generateTestReport(testName: string, results: any): Promise<void> {
    const report = {
      testName,
      timestamp: new Date().toISOString(),
      results,
      environment: {
        browser: process.env.BROWSER || 'chromium',
        baseURL: process.env.BASE_URL || 'https://d2pbh2fudgytg0.cloudfront.net',
      },
    };

    // This would write to a file in real implementation
    console.log('Test Report:', JSON.stringify(report, null, 2));
  }

  static async retryOnFailure<T>(
    action: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await action();
      } catch (error) {
        lastError = error as Error;
        if (i < maxRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
        }
      }
    }

    throw lastError;
  }

  static async waitForCondition(
    condition: () => Promise<boolean>,
    timeout: number = 10000,
    interval: number = 500
  ): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    throw new Error(`Condition not met within ${timeout}ms`);
  }
}

export default TestHelpers;
