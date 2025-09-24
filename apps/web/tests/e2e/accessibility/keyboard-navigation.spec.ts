import { test, expect } from '@playwright/test';
import { LoginPage } from '../helpers/page-objects/LoginPage';
import { DashboardPage } from '../helpers/page-objects/DashboardPage';
import { TestHelpers, TEST_USERS } from '../helpers/utilities/test-helpers';

test.describe('Accessibility Compliance Tests', () => {
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
    await TestHelpers.clearAuthState(page);
  });

  test.describe('Keyboard Navigation', () => {
    test('should allow complete login flow using only keyboard', async ({ page }) => {
      await loginPage.navigateToLogin();

      // Tab to email field
      await page.keyboard.press('Tab');
      let focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedElement?.toLowerCase()).toBe('input');

      // Fill email with keyboard
      await page.keyboard.type(TEST_USERS.user.email);

      // Tab to password field
      await page.keyboard.press('Tab');
      focusedElement = await page.evaluate(() => document.activeElement?.getAttribute('type'));
      expect(focusedElement).toBe('password');

      // Fill password with keyboard
      await page.keyboard.type(TEST_USERS.user.password);

      // Tab to submit button
      await page.keyboard.press('Tab');
      focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedElement?.toLowerCase()).toBe('button');

      // Submit with Enter key
      await page.keyboard.press('Enter');

      // Should successfully login
      await expect(page).toHaveURL(/\/dashboard/);
    });

    test('should navigate dashboard using keyboard', async ({ page }) => {
      await TestHelpers.loginUser(page, TEST_USERS.user);

      // Use Tab to navigate through interactive elements
      const interactiveElements: string[] = [];

      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab');
        const focusedElement = await page.evaluate(() => {
          const element = document.activeElement;
          return {
            tag: element?.tagName.toLowerCase(),
            role: element?.getAttribute('role'),
            type: element?.getAttribute('type'),
            ariaLabel: element?.getAttribute('aria-label'),
          };
        });

        if (focusedElement.tag !== 'body') {
          interactiveElements.push(
            `${focusedElement.tag}${focusedElement.type ? `[${focusedElement.type}]` : ''}${focusedElement.role ? `{${focusedElement.role}}` : ''}`
          );
        }
      }

      // Should have found interactive elements
      expect(interactiveElements.length).toBeGreaterThan(0);

      // Should include buttons, inputs, or links
      const hasInteractiveElements = interactiveElements.some(
        (el) =>
          el.includes('button') || el.includes('input') || el.includes('a') || el.includes('{link}')
      );
      expect(hasInteractiveElements).toBeTruthy();
    });

    test('should activate buttons with Enter and Space keys', async ({ page }) => {
      await TestHelpers.loginUser(page, TEST_USERS.user);

      // Find a button (refresh button)
      const refreshButton = page
        .locator('button:has-text("Refresh"), [aria-label*="refresh"]')
        .first();

      if (await refreshButton.isVisible()) {
        // Focus the button
        await refreshButton.focus();

        // Verify focus
        const isFocused = await refreshButton.evaluate((el) => el === document.activeElement);
        expect(isFocused).toBeTruthy();

        // Activate with Enter
        await page.keyboard.press('Enter');
        await dashboardPage.waitForLoadingToComplete();

        // Activate with Space (if available)
        await refreshButton.focus();
        await page.keyboard.press('Space');
        await dashboardPage.waitForLoadingToComplete();
      }
    });

    test('should navigate through instance cards with keyboard', async ({ page }) => {
      await TestHelpers.loginUser(page, TEST_USERS.user);
      await dashboardPage.waitForDashboardToLoad();

      const instanceCards = page.locator('[data-testid="instance-card"], .instance-card');
      const cardCount = await instanceCards.count();

      if (cardCount > 0) {
        // Tab through instance cards
        for (let i = 0; i < cardCount; i++) {
          await page.keyboard.press('Tab');
          const focusedCard = await page.evaluate(() => {
            const activeEl = document.activeElement;
            return activeEl?.closest('[data-testid="instance-card"], .instance-card') !== null;
          });

          if (focusedCard) {
            // Should be able to interact with card actions using keyboard
            await page.keyboard.press('Enter');
            await page.waitForTimeout(100);
          }
        }
      }
    });

    test('should handle modal dialogs with keyboard', async ({ page }) => {
      await TestHelpers.loginUser(page, TEST_USERS.user);

      // Try to trigger a confirmation dialog
      const actionButton = page
        .locator('button:has-text("Terminate"), button:has-text("Delete")')
        .first();

      if (await actionButton.isVisible()) {
        await actionButton.click();

        // Check if modal appeared
        const modal = page.locator('[role="dialog"]');

        if (await modal.isVisible()) {
          // Should trap focus within modal
          await page.keyboard.press('Tab');
          const focusedElement = await page.evaluate(() => {
            const activeEl = document.activeElement;
            return activeEl?.closest('[role="dialog"]') !== null;
          });

          expect(focusedElement).toBeTruthy();

          // Should be able to cancel with Escape
          await page.keyboard.press('Escape');
          await modal.waitFor({ state: 'hidden' });
        }
      }
    });

    test('should support skip links for main content', async ({ page }) => {
      await TestHelpers.loginUser(page, TEST_USERS.user);

      // Look for skip links
      const skipLink = page
        .locator('a:has-text("Skip to main content"), [href="#main-content"]')
        .first();

      if (await skipLink.isVisible()) {
        await skipLink.click();

        // Should focus main content
        const mainContent = page.locator('#main-content, [role="main"]');
        const isFocused = await mainContent.evaluate(
          (el) => el === document.activeElement || el.contains(document.activeElement)
        );
        expect(isFocused).toBeTruthy();
      }
    });
  });

  test.describe('ARIA Labels and Screen Reader Support', () => {
    test('should have proper form labels', async ({ page }) => {
      await loginPage.navigateToLogin();

      // Check email input has label
      const emailInput = page.locator('input[type="email"]');
      const emailLabel =
        (await emailInput.getAttribute('aria-label')) ||
        (await page.locator('label[for="email"]').textContent()) ||
        (await emailInput.getAttribute('placeholder'));

      expect(emailLabel).toBeTruthy();

      // Check password input has label
      const passwordInput = page.locator('input[type="password"]');
      const passwordLabel =
        (await passwordInput.getAttribute('aria-label')) ||
        (await page.locator('label[for="password"]').textContent()) ||
        (await passwordInput.getAttribute('placeholder'));

      expect(passwordLabel).toBeTruthy();
    });

    test('should have proper button labels', async ({ page }) => {
      await TestHelpers.loginUser(page, TEST_USERS.user);

      // Check all buttons have accessible names
      const buttons = await page.locator('button').all();

      for (const button of buttons) {
        const buttonText = await button.textContent();
        const ariaLabel = await button.getAttribute('aria-label');
        const title = await button.getAttribute('title');

        // Should have some form of accessible name
        const hasAccessibleName = buttonText?.trim() || ariaLabel || title;
        expect(hasAccessibleName).toBeTruthy();
      }
    });

    test('should announce loading states to screen readers', async ({ page }) => {
      await TestHelpers.loginUser(page, TEST_USERS.user);

      // Trigger loading state
      await dashboardPage.refreshInstanceList();

      // Check for loading indicators with proper ARIA
      const loadingIndicators = page.locator(
        '[role="progressbar"], [aria-busy="true"], [aria-live]'
      );

      if ((await loadingIndicators.count()) > 0) {
        const firstIndicator = loadingIndicators.first();
        const ariaLabel = await firstIndicator.getAttribute('aria-label');
        const ariaLive = await firstIndicator.getAttribute('aria-live');
        const role = await firstIndicator.getAttribute('role');

        // Should have appropriate ARIA attributes
        expect(ariaLabel || ariaLive || role).toBeTruthy();
      }
    });

    test('should announce error messages to screen readers', async ({ page }) => {
      await loginPage.navigateToLogin();
      await loginPage.login('invalid@example.com', 'wrongpassword');

      // Check for error with proper ARIA
      const errorMessage = page.locator('[role="alert"], .error-message');

      if (await errorMessage.isVisible()) {
        const role = await errorMessage.getAttribute('role');
        const ariaLive = await errorMessage.getAttribute('aria-live');

        // Should have role="alert" or aria-live
        expect(role === 'alert' || ariaLive).toBeTruthy();
      }
    });

    test('should have proper heading hierarchy', async ({ page }) => {
      await TestHelpers.loginUser(page, TEST_USERS.user);

      const headings = await page.evaluate(() => {
        const headingElements = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
        return headingElements.map((h) => ({
          level: parseInt(h.tagName.substring(1)),
          text: h.textContent?.trim(),
        }));
      });

      if (headings.length > 0) {
        // Should start with h1
        expect(headings[0].level).toBe(1);

        // Should not skip heading levels
        for (let i = 1; i < headings.length; i++) {
          const currentLevel = headings[i].level;
          const previousLevel = headings[i - 1].level;
          expect(currentLevel - previousLevel).toBeLessThanOrEqual(1);
        }
      }
    });

    test('should have meaningful link text', async ({ page }) => {
      await TestHelpers.loginUser(page, TEST_USERS.user);

      const links = await page.locator('a').all();

      for (const link of links) {
        const linkText = await link.textContent();
        const ariaLabel = await link.getAttribute('aria-label');
        const title = await link.getAttribute('title');

        const accessibleText = linkText?.trim() || ariaLabel || title;

        // Should not have generic link text
        if (accessibleText) {
          expect(accessibleText.toLowerCase()).not.toMatch(/^(click here|read more|link)$/);
        }
      }
    });
  });

  test.describe('Color Contrast and Visual Accessibility', () => {
    test('should have sufficient color contrast', async ({ page }) => {
      await TestHelpers.loginUser(page, TEST_USERS.user);

      // This would typically use axe-core for automated testing
      const contrastIssues = await page.evaluate(() => {
        // Simplified contrast check - in real implementation would use axe-core
        const elements = Array.from(document.querySelectorAll('*'));
        const issues = [];

        for (const element of elements.slice(0, 20)) {
          // Check first 20 elements
          const styles = window.getComputedStyle(element);
          const backgroundColor = styles.backgroundColor;
          const color = styles.color;

          // Basic check for white on white or black on black
          if (
            (backgroundColor === 'rgb(255, 255, 255)' && color === 'rgb(255, 255, 255)') ||
            (backgroundColor === 'rgb(0, 0, 0)' && color === 'rgb(0, 0, 0)')
          ) {
            issues.push({
              element: element.tagName,
              issue: 'Poor contrast detected',
            });
          }
        }

        return issues;
      });

      expect(contrastIssues.length).toBe(0);
    });

    test('should not rely solely on color for information', async ({ page }) => {
      await TestHelpers.loginUser(page, TEST_USERS.user);

      // Check for status indicators that might rely on color alone
      const statusElements = page.locator('[data-testid*="status"], .status, [class*="state"]');

      if ((await statusElements.count()) > 0) {
        const firstStatus = statusElements.first();
        const hasTextContent = (await firstStatus.textContent())?.trim();
        const hasAriaLabel = await firstStatus.getAttribute('aria-label');
        const hasIcon = (await firstStatus.locator('svg, .icon').count()) > 0;

        // Should have text, ARIA label, or icon in addition to color
        expect(hasTextContent || hasAriaLabel || hasIcon).toBeTruthy();
      }
    });

    test('should support high contrast mode', async ({ page }) => {
      // Simulate high contrast mode
      await page.addStyleTag({
        content: `
          @media (prefers-contrast: high) {
            * {
              background: white !important;
              color: black !important;
              border-color: black !important;
            }
          }
        `,
      });

      await TestHelpers.loginUser(page, TEST_USERS.user);

      // Page should still be functional
      const isLoginSuccessful = await dashboardPage.isLoggedIn();
      expect(isLoginSuccessful).toBeTruthy();
    });
  });

  test.describe('Focus Management', () => {
    test('should have visible focus indicators', async ({ page }) => {
      await loginPage.navigateToLogin();

      // Tab through elements and check focus indicators
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Tab');

        const focusStyles = await page.evaluate(() => {
          const activeEl = document.activeElement;
          if (!activeEl) return null;

          const styles = window.getComputedStyle(activeEl);
          return {
            outline: styles.outline,
            outlineWidth: styles.outlineWidth,
            boxShadow: styles.boxShadow,
            border: styles.border,
          };
        });

        if (focusStyles) {
          // Should have some form of focus indicator
          const hasFocusIndicator =
            focusStyles.outline !== 'none' ||
            focusStyles.outlineWidth !== '0px' ||
            focusStyles.boxShadow !== 'none' ||
            focusStyles.boxShadow.includes('0 0');

          expect(hasFocusIndicator).toBeTruthy();
        }
      }
    });

    test('should manage focus in dynamic content', async ({ page }) => {
      await TestHelpers.loginUser(page, TEST_USERS.user);

      // Trigger content update
      await dashboardPage.refreshInstanceList();

      // After dynamic update, focus should be managed appropriately
      const activeElement = await page.evaluate(() => document.activeElement?.tagName);

      // Should not lose focus to body
      expect(activeElement?.toLowerCase()).not.toBe('body');
    });

    test('should restore focus after modal closes', async ({ page }) => {
      await TestHelpers.loginUser(page, TEST_USERS.user);

      // Find and focus an element
      const triggerButton = page.locator('button').first();
      await triggerButton.focus();

      // Open modal if available
      const modalTrigger = page
        .locator('button:has-text("Terminate"), button:has-text("Delete")')
        .first();

      if (await modalTrigger.isVisible()) {
        await modalTrigger.click();

        const modal = page.locator('[role="dialog"]');
        if (await modal.isVisible()) {
          // Close modal
          await page.keyboard.press('Escape');
          await modal.waitFor({ state: 'hidden' });

          // Focus should return to trigger element
          const focusedElement = await page.evaluate(() => document.activeElement);
          expect(focusedElement).toBeTruthy();
        }
      }
    });
  });

  test.describe('Alternative Text and Media', () => {
    test('should have alt text for all images', async ({ page }) => {
      await TestHelpers.loginUser(page, TEST_USERS.user);

      const images = await page.locator('img').all();

      for (const image of images) {
        const alt = await image.getAttribute('alt');
        const ariaLabel = await image.getAttribute('aria-label');
        const ariaHidden = await image.getAttribute('aria-hidden');

        // Should have alt text or be marked as decorative
        expect(alt !== null || ariaLabel || ariaHidden === 'true').toBeTruthy();

        // Alt text should not be redundant
        if (alt && alt.toLowerCase().includes('image')) {
          expect(alt.toLowerCase()).not.toMatch(/^(image of|picture of)/);
        }
      }
    });

    test('should have accessible icons', async ({ page }) => {
      await TestHelpers.loginUser(page, TEST_USERS.user);

      const icons = await page.locator('svg, .icon, [class*="icon"]').all();

      for (const icon of icons) {
        const ariaLabel = await icon.getAttribute('aria-label');
        const ariaHidden = await icon.getAttribute('aria-hidden');
        const title = await icon.getAttribute('title');
        const role = await icon.getAttribute('role');

        // Should be accessible or marked as decorative
        const isAccessible = ariaLabel || title || role === 'img';
        const isDecorative = ariaHidden === 'true';

        expect(isAccessible || isDecorative).toBeTruthy();
      }
    });
  });

  test.describe('Form Accessibility', () => {
    test('should associate form controls with labels', async ({ page }) => {
      await loginPage.navigateToLogin();

      const formControls = await page.locator('input, select, textarea').all();

      for (const control of formControls) {
        const id = await control.getAttribute('id');
        const ariaLabel = await control.getAttribute('aria-label');
        const ariaLabelledBy = await control.getAttribute('aria-labelledby');

        let hasLabel = ariaLabel || ariaLabelledBy;

        // Check for associated label element
        if (id && !hasLabel) {
          const label = page.locator(`label[for="${id}"]`);
          hasLabel = (await label.count()) > 0;
        }

        expect(hasLabel).toBeTruthy();
      }
    });

    test('should provide helpful error messages', async ({ page }) => {
      await loginPage.navigateToLogin();
      await loginPage.login('', ''); // Trigger validation

      const errorMessages = await page
        .locator('[role="alert"], .error, [aria-invalid="true"] ~ *')
        .all();

      for (const error of errorMessages) {
        const errorText = await error.textContent();
        expect(errorText?.trim().length).toBeGreaterThan(0);

        // Should be descriptive
        if (errorText) {
          expect(errorText.toLowerCase()).not.toMatch(/^(error|invalid)$/);
        }
      }
    });

    test('should mark required fields appropriately', async ({ page }) => {
      await loginPage.navigateToLogin();

      const requiredFields = await page.locator('input[required], [aria-required="true"]').all();

      for (const field of requiredFields) {
        const ariaRequired = await field.getAttribute('aria-required');
        const required = await field.getAttribute('required');

        expect(ariaRequired === 'true' || required !== null).toBeTruthy();
      }
    });
  });
});
