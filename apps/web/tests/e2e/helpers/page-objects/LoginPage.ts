import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  private readonly selectors = {
    emailInput: 'input[type="email"], input[name="email"], #email',
    passwordInput: 'input[type="password"], input[name="password"], #password',
    submitButton: 'button[type="submit"], button:has-text("Sign In"), button:has-text("Login")',
    errorMessage: '[role="alert"], .error-message, .MuiAlert-message',
    forgotPasswordLink: 'a:has-text("Forgot Password")',
    signUpLink: 'a:has-text("Sign Up"), a:has-text("Create Account")',
    rememberMeCheckbox:
      'input[type="checkbox"][name="remember"], input[type="checkbox"]:near(:text("Remember"))',
    loadingSpinner: '.MuiCircularProgress-root, [role="progressbar"]',
    pageTitle: 'h1, h2:has-text("Sign In"), h2:has-text("Login")',
  };

  constructor(page: Page) {
    super(page);
  }

  async navigateToLogin(): Promise<void> {
    await this.navigate('/login');
    await this.waitForPageLoad();
  }

  async enterEmail(email: string): Promise<void> {
    await this.fillInput(this.selectors.emailInput, email);
  }

  async enterPassword(password: string): Promise<void> {
    await this.fillInput(this.selectors.passwordInput, password);
  }

  async clickSubmit(): Promise<void> {
    await this.clickElement(this.selectors.submitButton);
  }

  async login(email: string, password: string): Promise<void> {
    await this.enterEmail(email);
    await this.enterPassword(password);
    await this.clickSubmit();
  }

  async loginWithRememberMe(email: string, password: string): Promise<void> {
    await this.enterEmail(email);
    await this.enterPassword(password);
    await this.toggleRememberMe(true);
    await this.clickSubmit();
  }

  async toggleRememberMe(check: boolean): Promise<void> {
    const checkbox = this.page.locator(this.selectors.rememberMeCheckbox);
    if (await checkbox.isVisible()) {
      const isChecked = await checkbox.isChecked();
      if (isChecked !== check) {
        await checkbox.click();
      }
    }
  }

  async getErrorMessage(): Promise<string | null> {
    const errorElement = this.page.locator(this.selectors.errorMessage);
    if (await errorElement.isVisible()) {
      return await errorElement.textContent();
    }
    return null;
  }

  async waitForErrorMessage(timeout: number = 5000): Promise<string | null> {
    try {
      const errorElement = await this.waitForElement(this.selectors.errorMessage, timeout);
      return await errorElement.textContent();
    } catch {
      return null;
    }
  }

  async isLoginFormVisible(): Promise<boolean> {
    return (
      (await this.isElementVisible(this.selectors.emailInput)) &&
      (await this.isElementVisible(this.selectors.passwordInput)) &&
      (await this.isElementVisible(this.selectors.submitButton))
    );
  }

  async waitForLoginFormToLoad(): Promise<void> {
    await this.waitForElement(this.selectors.emailInput);
    await this.waitForElement(this.selectors.passwordInput);
    await this.waitForElement(this.selectors.submitButton);
  }

  async clickForgotPassword(): Promise<void> {
    await this.clickElement(this.selectors.forgotPasswordLink);
  }

  async clickSignUp(): Promise<void> {
    await this.clickElement(this.selectors.signUpLink);
  }

  async isLoadingSpinnerVisible(): Promise<boolean> {
    return await this.isElementVisible(this.selectors.loadingSpinner);
  }

  async waitForLoadingToComplete(timeout: number = 10000): Promise<void> {
    const spinner = this.page.locator(this.selectors.loadingSpinner);
    await spinner.waitFor({ state: 'hidden', timeout });
  }

  async getPageTitle(): Promise<string> {
    return await this.getElementText(this.selectors.pageTitle);
  }

  async isSubmitButtonEnabled(): Promise<boolean> {
    const button = this.page.locator(this.selectors.submitButton);
    return await button.isEnabled();
  }

  async getEmailInputValue(): Promise<string> {
    return await this.page.locator(this.selectors.emailInput).inputValue();
  }

  async getPasswordInputValue(): Promise<string> {
    return await this.page.locator(this.selectors.passwordInput).inputValue();
  }

  async clearEmailInput(): Promise<void> {
    await this.page.locator(this.selectors.emailInput).clear();
  }

  async clearPasswordInput(): Promise<void> {
    await this.page.locator(this.selectors.passwordInput).clear();
  }

  async clearForm(): Promise<void> {
    await this.clearEmailInput();
    await this.clearPasswordInput();
  }

  async submitWithEnterKey(): Promise<void> {
    await this.page.locator(this.selectors.passwordInput).press('Enter');
  }

  async getFieldValidationError(fieldName: 'email' | 'password'): Promise<string | null> {
    const selector =
      fieldName === 'email' ? this.selectors.emailInput : this.selectors.passwordInput;
    const fieldElement = this.page.locator(selector);
    const errorElement = fieldElement.locator('~ .MuiFormHelperText-root, ~ .error-text');
    if (await errorElement.isVisible()) {
      return await errorElement.textContent();
    }
    return null;
  }

  async waitForRedirectToDashboard(timeout: number = 10000): Promise<void> {
    await this.page.waitForURL(/\/dashboard/, { timeout });
  }

  async isRememberMeChecked(): Promise<boolean> {
    const checkbox = this.page.locator(this.selectors.rememberMeCheckbox);
    if (await checkbox.isVisible()) {
      return await checkbox.isChecked();
    }
    return false;
  }

  async getAuthTokenFromStorage(): Promise<string | null> {
    return await this.getLocalStorageItem('authToken');
  }

  async hasAuthCookie(): Promise<boolean> {
    const cookie = await this.getCookie('auth-token');
    return cookie !== undefined;
  }

  async measureLoginTime(): Promise<number> {
    const startTime = Date.now();
    await this.clickSubmit();
    await this.waitForRedirectToDashboard();
    return Date.now() - startTime;
  }
}
