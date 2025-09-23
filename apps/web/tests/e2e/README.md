# EC2 Manager - End-to-End Testing with Playwright

This directory contains comprehensive end-to-end tests for the EC2 Manager application using Playwright.

## 🎯 Test Coverage

The test suite covers:
- **Authentication Flow**: Login validation, error handling, success flows
- **Protected Routes**: Route protection and redirects
- **Dashboard Functionality**: Instance display, data grid features, refresh functionality
- **Logout Process**: Session cleanup and redirection
- **Responsive Design**: Mobile and desktop layouts
- **Error Handling**: API failures and network issues
- **Complete User Journey**: Full end-to-end workflows

## 📋 Prerequisites

1. **Node.js**: Version 18 or higher
2. **Valid Test Credentials**: AWS Cognito user account for testing
3. **Application Access**: The application must be deployed and accessible at the configured URL

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd apps/web
npm install
```

### 2. Install Playwright Browsers

```bash
npm run test:e2e:install
```

### 3. Configure Test Credentials

Copy the environment template and add your credentials:

```bash
cp .env.test.example .env.test
```

Edit `.env.test` with your actual test credentials:

```env
E2E_TEST_EMAIL=your-test-email@example.com
E2E_TEST_PASSWORD=your-test-password
```

**⚠️ Important**: Never commit actual credentials to version control!

### 4. Run Tests

Choose from several test execution options:

```bash
# Run all tests (headless mode)
npm run test:e2e

# Run tests with browser UI visible (useful for debugging)
npm run test:e2e:headed

# Run tests in debug mode with step-by-step execution
npm run test:e2e:debug

# Run tests with Playwright UI (interactive mode)
npm run test:e2e:ui

# View test report after execution
npm run test:e2e:report
```

## 🎨 Test Execution Modes

### Headless Mode (CI/Production)
```bash
npm run test:e2e
```
- Runs in background without browser UI
- Fastest execution
- Best for CI/CD pipelines

### Headed Mode (Development)
```bash
npm run test:e2e:headed
```
- Shows browser UI during test execution
- Useful for watching test behavior
- Good for debugging visual issues

### Debug Mode (Troubleshooting)
```bash
npm run test:e2e:debug
```
- Step-by-step execution
- Pause at breakpoints
- Interactive debugging capabilities

### UI Mode (Interactive)
```bash
npm run test:e2e:ui
```
- Web-based test runner
- Visual test exploration
- Real-time test editing and execution

## 📊 Test Reports

After running tests, you can view detailed reports:

```bash
npm run test:e2e:report
```

Reports include:
- Test execution summary
- Screenshots of failures
- Video recordings (on failure)
- Trace files for debugging
- Performance metrics

## 📁 Project Structure

```
tests/e2e/
├── README.md                    # This file
├── auth-dashboard.spec.ts       # Main test suite
├── global-setup.ts             # Global test setup
├── global-teardown.ts          # Global test cleanup
└── test-results/               # Generated test artifacts
    ├── results.json           # JSON test results
    ├── results.xml            # JUnit test results
    └── playwright-report/     # HTML report
```

## 🧪 Test Scenarios

### Authentication Tests
- ✅ Login form validation
- ✅ Invalid credential handling
- ✅ Successful authentication flow
- ✅ Redirect behavior for authenticated users
- ✅ Protected route access

### Dashboard Tests
- ✅ Dashboard layout and components
- ✅ Instance data display (with data or empty state)
- ✅ Data grid functionality
- ✅ Manual refresh capability
- ✅ Auto-refresh behavior
- ✅ Loading states and error handling

### Logout Tests
- ✅ Logout process
- ✅ Session cleanup
- ✅ Redirect to login page
- ✅ Route protection after logout

### Responsive Design Tests
- ✅ Mobile navigation
- ✅ Tablet layouts
- ✅ Desktop functionality

### Complete User Journey
- ✅ End-to-end workflow: Login → Dashboard → Interact → Logout

## ⚙️ Configuration

### Playwright Configuration
The main configuration is in `/apps/web/playwright.config.ts`:

- **Base URL**: `https://d2pbh2fudgytg0.cloudfront.net`
- **Browsers**: Chromium, Firefox, WebKit
- **Mobile Testing**: iOS Safari, Android Chrome
- **Timeouts**: 60s per test, 15s for navigation
- **Retries**: 2 retries on CI, 0 locally
- **Reporters**: HTML, JSON, JUnit

### Environment Variables
Available in `.env.test`:

```env
# Required
E2E_TEST_EMAIL=your-test-email@example.com
E2E_TEST_PASSWORD=your-test-password

# Optional
E2E_BASE_URL=https://d2pbh2fudgytg0.cloudfront.net
E2E_TIMEOUT=60000
```

### Browser Configuration
By default, tests run with:
- **Headless**: `false` (for development)
- **Viewport**: 1280x720 (desktop), device-specific (mobile)
- **Screenshots**: On failure only
- **Videos**: Retained on failure
- **Traces**: On first retry

## 🐛 Debugging Failed Tests

### 1. View Test Report
```bash
npm run test:e2e:report
```

### 2. Run Specific Test
```bash
npx playwright test --grep "should successfully login"
```

### 3. Run in Debug Mode
```bash
npm run test:e2e:debug
```

### 4. View Screenshots and Videos
Check `test-results/` directory for failure artifacts.

### 5. Use Trace Viewer
```bash
npx playwright show-trace test-results/traces/trace.zip
```

## 🔧 Common Issues and Solutions

### Issue: "Missing environment variables"
**Solution**: Create `.env.test` file with valid credentials

### Issue: "Application not reachable"
**Solution**: Verify the application URL is correct and accessible

### Issue: "Login fails with valid credentials"
**Solution**:
- Verify credentials work in browser manually
- Check if account is active/confirmed
- Ensure test user has necessary permissions

### Issue: "Tests timeout"
**Solution**:
- Increase timeout in playwright.config.ts
- Check network connectivity
- Verify application performance

### Issue: "Browser installation fails"
**Solution**:
```bash
# Re-install browsers
npx playwright install --force
```

## 🚀 CI/CD Integration

### GitHub Actions Example
```yaml
- name: Install dependencies
  run: npm ci

- name: Install Playwright
  run: npx playwright install --with-deps

- name: Run E2E tests
  run: npm run test:e2e
  env:
    E2E_TEST_EMAIL: ${{ secrets.E2E_TEST_EMAIL }}
    E2E_TEST_PASSWORD: ${{ secrets.E2E_TEST_PASSWORD }}

- name: Upload test results
  uses: actions/upload-artifact@v3
  if: always()
  with:
    name: playwright-report
    path: apps/web/playwright-report/
```

## 📚 Additional Resources

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright Testing Library](https://playwright.dev/docs/test-configuration)
- [AWS Cognito Authentication](https://docs.aws.amazon.com/cognito/)

## 🤝 Contributing

When adding new tests:

1. Follow existing patterns and naming conventions
2. Add appropriate comments and documentation
3. Include both positive and negative test cases
4. Test responsive behavior when applicable
5. Update this README if adding new test categories

## 📝 Notes

- Tests are designed to run against the production environment
- Use environment variables for any configurable values
- Always clean up test data and authentication state
- Consider test isolation - each test should be independent
- Monitor test execution time and optimize slow tests