import { Page, Locator } from '@playwright/test';

export abstract class BasePage {
  protected page: Page;
  protected readonly baseURL: string;

  constructor(page: Page) {
    this.page = page;
    this.baseURL = process.env.BASE_URL || 'https://d2pbh2fudgytg0.cloudfront.net';
  }

  async navigate(path: string = ''): Promise<void> {
    await this.page.goto(`${this.baseURL}${path}`);
  }

  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  async waitForElement(selector: string, timeout: number = 10000): Promise<Locator> {
    const element = this.page.locator(selector);
    await element.waitFor({ state: 'visible', timeout });
    return element;
  }

  async takeScreenshot(name: string): Promise<void> {
    await this.page.screenshot({ path: `test-results/screenshots/${name}.png`, fullPage: true });
  }

  async getTitle(): Promise<string> {
    return await this.page.title();
  }

  async getURL(): Promise<string> {
    return this.page.url();
  }

  async reload(): Promise<void> {
    await this.page.reload();
  }

  async waitForNavigation(url?: string | RegExp): Promise<void> {
    await this.page.waitForURL(url || /.*/, { timeout: 15000 });
  }

  async isElementVisible(selector: string): Promise<boolean> {
    return await this.page.locator(selector).isVisible();
  }

  async getElementText(selector: string): Promise<string> {
    return (await this.page.locator(selector).textContent()) || '';
  }

  async clickElement(selector: string): Promise<void> {
    await this.page.locator(selector).click();
  }

  async fillInput(selector: string, value: string): Promise<void> {
    await this.page.locator(selector).fill(value);
  }

  async selectOption(selector: string, value: string): Promise<void> {
    await this.page.locator(selector).selectOption(value);
  }

  async getErrorMessage(): Promise<string | null> {
    const errorElement = this.page.locator('[role="alert"], .error-message, .MuiAlert-message');
    if (await errorElement.isVisible()) {
      return await errorElement.textContent();
    }
    return null;
  }

  async waitForToast(timeout: number = 5000): Promise<string | null> {
    const toast = this.page.locator('.MuiSnackbar-root, [role="alert"]');
    try {
      await toast.waitFor({ state: 'visible', timeout });
      return await toast.textContent();
    } catch {
      return null;
    }
  }

  async dismissToast(): Promise<void> {
    const closeButton = this.page.locator('.MuiSnackbar-root button, [role="alert"] button');
    if (await closeButton.isVisible()) {
      await closeButton.click();
    }
  }

  async getLocalStorageItem(key: string): Promise<string | null> {
    return await this.page.evaluate((k) => localStorage.getItem(k), key);
  }

  async setLocalStorageItem(key: string, value: string): Promise<void> {
    await this.page.evaluate(({ k, v }) => localStorage.setItem(k, v), { k: key, v: value });
  }

  async clearLocalStorage(): Promise<void> {
    await this.page.evaluate(() => localStorage.clear());
  }

  async getCookie(name: string): Promise<string | undefined> {
    const cookies = await this.page.context().cookies();
    const cookie = cookies.find((c) => c.name === name);
    return cookie?.value;
  }

  async setCookie(name: string, value: string): Promise<void> {
    await this.page.context().addCookies([
      {
        name,
        value,
        domain: new URL(this.baseURL).hostname,
        path: '/',
      },
    ]);
  }

  async clearCookies(): Promise<void> {
    await this.page.context().clearCookies();
  }

  async waitForAPIResponse(urlPattern: string | RegExp, timeout: number = 10000): Promise<any> {
    const response = await this.page.waitForResponse(
      (resp) => {
        const url = resp.url();
        if (typeof urlPattern === 'string') {
          return url.includes(urlPattern);
        }
        return urlPattern.test(url);
      },
      { timeout }
    );
    return await response.json();
  }

  async interceptAPICall(urlPattern: string | RegExp, mockResponse: any): Promise<void> {
    await this.page.route(urlPattern, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockResponse),
      });
    });
  }

  async getNetworkRequestCount(urlPattern: string | RegExp): Promise<number> {
    const requests = await this.page.evaluate((pattern: string | RegExp) => {
      return window.performance.getEntriesByType('resource').filter((entry) => {
        if (typeof pattern === 'string') {
          return entry.name.includes(pattern);
        }
        return new RegExp(pattern).test(entry.name);
      }).length;
    }, urlPattern);
    return requests;
  }

  async measurePageLoadTime(): Promise<number> {
    return await this.page.evaluate(() => {
      const perfData = window.performance.timing;
      return perfData.loadEventEnd - perfData.navigationStart;
    });
  }

  async checkAccessibility(): Promise<any> {
    // Placeholder for accessibility testing integration
    // Will integrate axe-core in later implementation
    return null;
  }

  async waitForTimeout(ms: number): Promise<void> {
    await this.page.waitForTimeout(ms);
  }
}
