# End-to-End Testing Guide

## Overview

This guide covers the comprehensive E2E testing infrastructure for the EC2 Instance Manager application. The test suite provides complete coverage of user workflows, error scenarios, performance benchmarks, accessibility compliance, and security validation.

## Test Architecture

### Directory Structure

```
apps/web/tests/e2e/
├── core-flows/              # Core user workflow tests
│   ├── authentication.spec.ts
│   ├── instance-management.spec.ts
│   ├── error-handling.spec.ts
│   └── responsive-and-security.spec.ts
├── accessibility/           # WCAG 2.1 AA compliance tests
│   └── keyboard-navigation.spec.ts
├── performance/            # Performance baseline tests
│   └── page-load-times.spec.ts
├── helpers/                # Test utilities and page objects
│   ├── page-objects/       # Page Object Model classes
│   │   ├── BasePage.ts
│   │   ├── LoginPage.ts
│   │   └── DashboardPage.ts
│   ├── test-data/          # Test data factories
│   │   └── test-data-factory.ts
│   └── utilities/          # Shared test utilities
│       └── test-helpers.ts
├── global-setup.ts         # Global test setup
├── global-teardown.ts      # Global test cleanup
└── README.md              # This file
```

### Page Object Model

The test suite uses the Page Object Model (POM) pattern for maintainable and reusable test code:

- **BasePage**: Common functionality shared across all pages
- **LoginPage**: Login-specific actions and assertions
- **DashboardPage**: Dashboard and instance management actions

## Running Tests

### Quick Start - Basic Functionality Tests

For day-to-day development, use the basic test suite that covers core functionality:

```bash
# ⚡ RECOMMENDED: Run basic E2E tests (login → dashboard → logout)
npm run test:e2e:basic

# Takes ~30-60 seconds, covers essential user workflows
```

This runs the `auth-dashboard-simple.spec.ts` file with 8 focused tests covering:

- Login page display and validation
- Authentication flow (valid/invalid credentials)
- Dashboard functionality after login
- Logout flow and session cleanup
- Complete user journey end-to-end

### Full Test Suite

For comprehensive testing before releases:

```bash
# Run all E2E tests (174 tests across all categories)
npm run test:e2e

# Run specific test file
npx playwright test authentication.spec.ts

# Run tests with UI mode for debugging
npx playwright test --ui

# Run tests in specific browser
npx playwright test --project=firefox
```

### CI/CD

```bash
# Run all tests in headless mode
CI=true npm run test:e2e

# Run with specific reporters
npx playwright test --reporter=html,json,junit
```

### Browser Configuration

The test suite runs on multiple browsers:

- **Chromium** (Desktop)
- **Firefox** (Desktop)
- **WebKit/Safari** (Desktop)
- **Chrome Mobile** (Mobile viewport)
- **Safari Mobile** (Mobile viewport)

## Test Categories

### 1. Authentication Flow Tests

**Location**: `core-flows/authentication.spec.ts`

**Coverage**:

- Valid/invalid login scenarios
- Password security validation
- Session management
- Token handling
- Multi-factor authentication (if enabled)
- Logout functionality
- Session timeout handling

**Key Tests**:

```typescript
test('should successfully login with valid credentials');
test('should handle SQL injection attempts safely');
test('should enforce rate limiting on failed attempts');
test('should maintain session across page refresh');
```

### 2. Instance Management Tests

**Location**: `core-flows/instance-management.spec.ts`

**Coverage**:

- Instance listing and filtering
- Instance state changes (start/stop/terminate/reboot)
- Batch operations
- Real-time status updates
- Permission-based action availability
- Region switching

**Key Tests**:

```typescript
test('should start a stopped instance');
test('should show confirmation dialog before destructive actions');
test('should perform batch operations efficiently');
test('should handle real-time status updates');
```

### 3. Error Handling Tests

**Location**: `core-flows/error-handling.spec.ts`

**Coverage**:

- Network connectivity failures
- API timeout scenarios
- HTTP status code handling (401, 403, 404, 429, 500, 502, 503)
- React error boundaries
- Toast notification behavior
- Error recovery mechanisms

**Key Tests**:

```typescript
test('should handle network connectivity failures gracefully');
test('should handle 401 authentication errors with login redirect');
test('should catch and display React errors gracefully');
test('should queue multiple error toasts appropriately');
```

### 4. Performance Baseline Tests

**Location**: `performance/page-load-times.spec.ts`

**Coverage**:

- Page load performance thresholds
- Login flow performance (< 2 seconds)
- Dashboard load performance (< 3 seconds)
- Instance list rendering (< 1.5 seconds)
- Memory leak detection
- Network optimization

**Performance Targets**:

- Login flow: < 2 seconds
- Dashboard load: < 3 seconds with typical data
- Instance operations: < 5 seconds for state changes
- Page transitions: < 1 second

**Key Tests**:

```typescript
test('should complete login within performance threshold');
test('should handle large datasets efficiently');
test('should not have memory leaks during normal usage');
test('should track Core Web Vitals');
```

### 5. Accessibility Compliance Tests

**Location**: `accessibility/keyboard-navigation.spec.ts`

**Coverage**:

- WCAG 2.1 AA compliance
- Keyboard navigation
- Screen reader compatibility
- Focus management
- ARIA labels and roles
- Color contrast validation
- Alternative text for images

**Key Tests**:

```typescript
test('should allow complete login flow using only keyboard');
test('should have visible focus indicators');
test('should have proper form labels');
test('should have sufficient color contrast');
```

### 6. Responsive Design Tests

**Location**: `core-flows/responsive-and-security.spec.ts`

**Coverage**:

- Multiple viewport sizes (desktop, tablet, mobile)
- Touch-friendly interactions
- Responsive navigation
- Layout stability across viewport transitions
- Mobile-specific functionality

**Viewports Tested**:

- Desktop: 1920x1080
- Laptop: 1366x768
- Tablet: 768x1024
- Mobile: 375x667
- Mobile Small: 320x568

### 7. Security Tests

**Location**: `core-flows/responsive-and-security.spec.ts`

**Coverage**:

- Token storage security
- CSRF protection
- XSS prevention
- Input sanitization
- Authorization boundary enforcement
- Session hijacking prevention

**Key Tests**:

```typescript
test('should use secure token storage');
test('should sanitize user inputs');
test('should enforce CSRF protection');
test('should handle logout security properly');
```

### 8. Cross-Browser Compatibility

**Coverage**:

- JavaScript feature compatibility
- CSS rendering consistency
- API compatibility
- Error handling across browsers

## Test Data Management

### Test Data Factory

The `TestDataFactory` class provides methods to create consistent test data:

```typescript
// Create test instances
const instances = TestDataFactory.createTestInstances(5);

// Create test users
const user = TestDataFactory.createTestUser({ role: 'admin' });

// Create login test cases
const loginCases = TestDataFactory.createLoginTestCases();
```

### Test Users

Standard test users are defined in `test-helpers.ts`:

```typescript
const TEST_USERS = {
  admin: { email: 'admin@example.com', password: 'Admin123!@#' },
  user: { email: 'user@example.com', password: 'User123!@#' },
  testUser: { email: 'test@example.com', password: 'Test123!@#' },
};
```

## Test Utilities

### Common Operations

The `TestHelpers` class provides utilities for common test operations:

```typescript
// Login user
await TestHelpers.loginUser(page, TEST_USERS.user);

// Clear authentication state
await TestHelpers.clearAuthState(page);

// Wait for page load
await TestHelpers.waitForPageLoad(page);

// Mock API responses
await TestHelpers.mockAPIResponse(page, /.*\/instances/, mockData);

// Measure performance
const time = await TestHelpers.measurePerformance(page, async () => {
  // Action to measure
});
```

### Page Objects

Page objects encapsulate page-specific actions and element selectors:

```typescript
// Login page
const loginPage = new LoginPage(page);
await loginPage.login(email, password);

// Dashboard page
const dashboardPage = new DashboardPage(page);
await dashboardPage.startInstance('instance-name');
const instances = await dashboardPage.getAllInstances();
```

## Configuration

### Environment Variables

- `CI`: Set to enable headless mode and CI-specific configuration
- `BASE_URL`: Override the base URL for testing (defaults to CloudFront distribution)
- `BROWSER`: Specify browser for single-browser testing

### Test Execution Settings

- **Timeout**: 60 seconds for test execution
- **Retries**: 2 retries in CI, 0 in development
- **Parallel Execution**: Enabled for faster feedback
- **Screenshots**: Captured on failure
- **Videos**: Recorded on failure
- **Traces**: Collected on retry

## Maintenance

### Adding New Tests

1. **Identify test category** (authentication, instance management, etc.)
2. **Create test file** in appropriate directory
3. **Use page objects** for element interactions
4. **Follow naming conventions** for test descriptions
5. **Add proper assertions** with meaningful error messages
6. **Include cleanup** in test teardown

### Updating Page Objects

When UI changes occur:

1. **Update selectors** in page object classes
2. **Add new methods** for new functionality
3. **Maintain backward compatibility** where possible
4. **Update documentation** for significant changes

### Performance Thresholds

Review and update performance thresholds quarterly:

1. **Analyze performance trends** from test reports
2. **Adjust thresholds** based on application changes
3. **Document threshold changes** in git commits
4. **Notify team** of significant changes

## CI/CD Integration

### GitHub Actions

The test suite integrates with GitHub Actions for automated execution:

```yaml
- name: Run E2E Tests
  run: npm run test:e2e
  env:
    CI: true
    BASE_URL: ${{ secrets.TEST_BASE_URL }}
```

### Test Reports

Multiple report formats are generated:

- **HTML Report**: Visual test results with screenshots
- **JSON Report**: Machine-readable results for analysis
- **JUnit Report**: Integration with CI/CD systems

### Artifacts

Test artifacts are stored for debugging:

- Screenshots on failure
- Videos on failure
- Trace files for detailed debugging
- Test reports in multiple formats

## Troubleshooting

### Common Issues

1. **Tests failing in CI but passing locally**:
   - Check headless vs headed mode differences
   - Verify environment variables
   - Review timing issues

2. **Flaky tests**:
   - Add proper waits instead of timeouts
   - Use stable selectors
   - Handle dynamic content properly

3. **Performance test failures**:
   - Check network conditions
   - Verify system resources
   - Review performance thresholds

### Debug Mode

Run tests in debug mode for troubleshooting:

```bash
# UI mode for step-by-step debugging
npx playwright test --ui

# Debug specific test
npx playwright test --debug authentication.spec.ts

# Generate trace
npx playwright test --trace on
```

### Log Analysis

Enable verbose logging for detailed information:

```bash
# Run with debug output
DEBUG=pw:api npx playwright test

# Browser console logs
npx playwright test --headed
```

## Best Practices

### Test Writing

1. **Use descriptive test names** that explain the expected behavior
2. **Follow AAA pattern** (Arrange, Act, Assert)
3. **Keep tests independent** and stateless
4. **Use page objects** for element interactions
5. **Mock external dependencies** when appropriate
6. **Add proper error handling** and cleanup

### Maintenance

1. **Regular test reviews** to identify flaky or outdated tests
2. **Performance monitoring** to catch regressions early
3. **Accessibility audits** to maintain compliance
4. **Security testing updates** to address new threats
5. **Browser compatibility checks** for new features

### Reporting

1. **Analyze test results** regularly for patterns
2. **Track performance trends** over time
3. **Monitor accessibility compliance** scores
4. **Document known issues** and workarounds
5. **Share insights** with development team

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [WCAG 2.1 AA Guidelines](https://www.w3.org/WAI/WCAG21/AA/)
- [Web Performance Metrics](https://web.dev/vitals/)
- [Accessibility Testing Guide](https://www.w3.org/WAI/test-evaluate/)

## Support

For questions or issues with the E2E test suite:

1. **Check this documentation** for common solutions
2. **Review existing tests** for similar patterns
3. **Create GitHub issue** for bugs or feature requests
4. **Contact QA team** for testing strategy questions
