import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class DashboardPage extends BasePage {
  private readonly selectors = {
    pageTitle: 'h1:has-text("EC2 Dashboard"), h1:has-text("Dashboard")',
    instanceCard: '[data-testid="instance-card"], .instance-card',
    instanceList: '[data-testid="instance-list"], .instance-list',
    instanceName: '[data-testid="instance-name"], .instance-name',
    instanceState: '[data-testid="instance-state"], .instance-state',
    instanceType: '[data-testid="instance-type"], .instance-type',
    instanceRegion: '[data-testid="instance-region"], .instance-region',
    startButton: 'button:has-text("Start")',
    stopButton: 'button:has-text("Stop")',
    terminateButton: 'button:has-text("Terminate")',
    rebootButton: 'button:has-text("Reboot")',
    refreshButton: 'button:has-text("Refresh"), [aria-label="Refresh"]',
    logoutButton: 'button:has-text("Logout"), button:has-text("Sign Out")',
    userMenu: '[data-testid="user-menu"], .user-menu',
    loadingIndicator: '.MuiCircularProgress-root, [role="progressbar"]',
    errorAlert: '.MuiAlert-error, [role="alert"][severity="error"]',
    successAlert: '.MuiAlert-success, [role="alert"][severity="success"]',
    emptyState: '[data-testid="empty-state"], .empty-state',
    filterInput: 'input[placeholder*="Search"], input[placeholder*="Filter"]',
    regionSelector: 'select[name="region"], [data-testid="region-selector"]',
    actionConfirmDialog: '[role="dialog"], .MuiDialog-root',
    confirmButton:
      '[role="dialog"] button:has-text("Confirm"), [role="dialog"] button:has-text("Yes")',
    cancelButton:
      '[role="dialog"] button:has-text("Cancel"), [role="dialog"] button:has-text("No")',
    instanceCount: '[data-testid="instance-count"], .instance-count',
  };

  constructor(page: Page) {
    super(page);
  }

  async navigateToDashboard(): Promise<void> {
    await this.navigate('/dashboard');
    await this.waitForPageLoad();
  }

  async waitForDashboardToLoad(): Promise<void> {
    await this.waitForElement(this.selectors.pageTitle);
    await this.waitForLoadingToComplete();
  }

  async waitForLoadingToComplete(timeout: number = 10000): Promise<void> {
    const spinner = this.page.locator(this.selectors.loadingIndicator);
    await spinner.waitFor({ state: 'hidden', timeout }).catch(() => {
      // Loading indicator may not appear if data loads quickly
    });
  }

  async getInstanceCount(): Promise<number> {
    const instances = await this.page.locator(this.selectors.instanceCard).all();
    return instances.length;
  }

  async getInstanceByName(name: string): Promise<any> {
    const card = this.page.locator(this.selectors.instanceCard).filter({
      has: this.page.locator(`text="${name}"`),
    });

    if ((await card.count()) === 0) {
      return null;
    }

    return {
      element: card,
      name: await card.locator(this.selectors.instanceName).textContent(),
      state: await card.locator(this.selectors.instanceState).textContent(),
      type: await card.locator(this.selectors.instanceType).textContent(),
      region: await card.locator(this.selectors.instanceRegion).textContent(),
    };
  }

  async getInstanceState(instanceName: string): Promise<string | null> {
    const instance = await this.getInstanceByName(instanceName);
    return instance?.state || null;
  }

  async startInstance(instanceName: string): Promise<void> {
    const instance = await this.getInstanceByName(instanceName);
    if (instance) {
      await instance.element.locator(this.selectors.startButton).click();
      await this.confirmAction();
    }
  }

  async stopInstance(instanceName: string): Promise<void> {
    const instance = await this.getInstanceByName(instanceName);
    if (instance) {
      await instance.element.locator(this.selectors.stopButton).click();
      await this.confirmAction();
    }
  }

  async terminateInstance(instanceName: string): Promise<void> {
    const instance = await this.getInstanceByName(instanceName);
    if (instance) {
      await instance.element.locator(this.selectors.terminateButton).click();
      await this.confirmAction();
    }
  }

  async rebootInstance(instanceName: string): Promise<void> {
    const instance = await this.getInstanceByName(instanceName);
    if (instance) {
      await instance.element.locator(this.selectors.rebootButton).click();
      await this.confirmAction();
    }
  }

  async confirmAction(): Promise<void> {
    const dialog = this.page.locator(this.selectors.actionConfirmDialog);
    if (await dialog.isVisible()) {
      await this.page.locator(this.selectors.confirmButton).click();
      await dialog.waitFor({ state: 'hidden' });
    }
  }

  async cancelAction(): Promise<void> {
    const dialog = this.page.locator(this.selectors.actionConfirmDialog);
    if (await dialog.isVisible()) {
      await this.page.locator(this.selectors.cancelButton).click();
      await dialog.waitFor({ state: 'hidden' });
    }
  }

  async refreshInstanceList(): Promise<void> {
    await this.clickElement(this.selectors.refreshButton);
    await this.waitForLoadingToComplete();
  }

  async filterInstances(searchTerm: string): Promise<void> {
    await this.fillInput(this.selectors.filterInput, searchTerm);
    await this.page.waitForTimeout(500); // Debounce delay
  }

  async selectRegion(region: string): Promise<void> {
    await this.selectOption(this.selectors.regionSelector, region);
    await this.waitForLoadingToComplete();
  }

  async logout(): Promise<void> {
    // First try to open user menu if it exists
    const userMenu = this.page.locator(this.selectors.userMenu);
    if (await userMenu.isVisible()) {
      await userMenu.click();
    }

    await this.clickElement(this.selectors.logoutButton);
    await this.waitForNavigation(/\/login/);
  }

  async isLoggedIn(): Promise<boolean> {
    return (
      (await this.isElementVisible(this.selectors.logoutButton)) ||
      (await this.isElementVisible(this.selectors.userMenu))
    );
  }

  async waitForInstanceStateChange(
    instanceName: string,
    expectedState: string,
    timeout: number = 30000
  ): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const currentState = await this.getInstanceState(instanceName);
      if (currentState === expectedState) {
        return true;
      }
      await this.page.waitForTimeout(2000);
      await this.refreshInstanceList();
    }

    return false;
  }

  async getErrorMessage(): Promise<string | null> {
    const errorAlert = this.page.locator(this.selectors.errorAlert);
    if (await errorAlert.isVisible()) {
      return await errorAlert.textContent();
    }
    return null;
  }

  async getSuccessMessage(): Promise<string | null> {
    const successAlert = this.page.locator(this.selectors.successAlert);
    if (await successAlert.isVisible()) {
      return await successAlert.textContent();
    }
    return null;
  }

  async isEmptyStateVisible(): Promise<boolean> {
    return await this.isElementVisible(this.selectors.emptyState);
  }

  async getAllInstances(): Promise<any[]> {
    const instances = [];
    const cards = await this.page.locator(this.selectors.instanceCard).all();

    for (const card of cards) {
      instances.push({
        name: await card.locator(this.selectors.instanceName).textContent(),
        state: await card.locator(this.selectors.instanceState).textContent(),
        type: await card.locator(this.selectors.instanceType).textContent(),
        region: await card.locator(this.selectors.instanceRegion).textContent(),
      });
    }

    return instances;
  }

  async isActionButtonEnabled(
    instanceName: string,
    action: 'start' | 'stop' | 'terminate' | 'reboot'
  ): Promise<boolean> {
    const instance = await this.getInstanceByName(instanceName);
    if (!instance) return false;

    const buttonSelector = {
      start: this.selectors.startButton,
      stop: this.selectors.stopButton,
      terminate: this.selectors.terminateButton,
      reboot: this.selectors.rebootButton,
    }[action];

    const button = instance.element.locator(buttonSelector);
    return await button.isEnabled();
  }

  async getDisplayedInstanceCount(): Promise<string | null> {
    const countElement = this.page.locator(this.selectors.instanceCount);
    if (await countElement.isVisible()) {
      return await countElement.textContent();
    }
    return null;
  }

  async measureDashboardLoadTime(): Promise<number> {
    const startTime = Date.now();
    await this.navigateToDashboard();
    await this.waitForDashboardToLoad();
    return Date.now() - startTime;
  }

  async waitForToastMessage(timeout: number = 5000): Promise<string | null> {
    return await this.waitForToast(timeout);
  }

  async checkForAccessibilityIssues(): Promise<any> {
    // This will be implemented with axe-core integration
    return await this.checkAccessibility();
  }
}
