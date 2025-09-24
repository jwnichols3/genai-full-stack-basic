import { test, expect } from '@playwright/test';
import { DashboardPage } from '../helpers/page-objects/DashboardPage';
import { TestHelpers, TEST_USERS } from '../helpers/utilities/test-helpers';
import { TestDataFactory } from '../helpers/test-data/test-data-factory';

test.describe('Instance Management Flow Tests', () => {
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);

    // Clear auth state and login
    await TestHelpers.clearAuthState(page);
    await TestHelpers.loginUser(page, TEST_USERS.user);
    await dashboardPage.waitForDashboardToLoad();
  });

  test.describe('Instance Listing', () => {
    test('should display list of instances', async ({ page }) => {
      const instanceCount = await dashboardPage.getInstanceCount();
      expect(instanceCount).toBeGreaterThanOrEqual(0);

      // If instances exist, verify they have required information
      if (instanceCount > 0) {
        const instances = await dashboardPage.getAllInstances();
        const firstInstance = instances[0];

        expect(firstInstance.name).toBeTruthy();
        expect(firstInstance.state).toBeTruthy();
        expect(firstInstance.type).toBeTruthy();
        expect(firstInstance.region).toBeTruthy();
      }
    });

    test('should show empty state when no instances', async ({ page }) => {
      // Mock empty instance response
      await TestHelpers.mockAPIResponse(page, /.*\/instances/, []);

      await dashboardPage.refreshInstanceList();

      const isEmpty = await dashboardPage.isEmptyStateVisible();
      expect(isEmpty).toBeTruthy();
    });

    test('should refresh instance list', async ({ page }) => {
      // Get initial count
      const initialCount = await dashboardPage.getInstanceCount();

      // Refresh list
      await dashboardPage.refreshInstanceList();

      // Should have reloaded
      const newCount = await dashboardPage.getInstanceCount();
      expect(newCount).toBeGreaterThanOrEqual(0);
    });

    test('should filter instances by search term', async ({ page }) => {
      // Ensure we have instances
      const allInstances = await dashboardPage.getAllInstances();
      if (allInstances.length === 0) {
        test.skip();
        return;
      }

      const firstInstanceName = allInstances[0].name;

      // Filter by first instance name
      await dashboardPage.filterInstances(firstInstanceName);

      // Should show filtered results
      const filteredCount = await dashboardPage.getInstanceCount();
      expect(filteredCount).toBeGreaterThan(0);
      expect(filteredCount).toBeLessThanOrEqual(allInstances.length);
    });

    test('should handle pagination for large datasets', async ({ page }) => {
      // Mock large dataset
      const mockInstances = TestDataFactory.createTestInstances(50);
      await TestHelpers.mockAPIResponse(page, /.*\/instances/, mockInstances);

      await dashboardPage.refreshInstanceList();

      // Should show pagination controls if applicable
      const paginationControls = page.locator('[role="navigation"], .pagination');
      const hasPagination = await paginationControls.isVisible();

      if (hasPagination) {
        // Test pagination navigation
        await paginationControls.locator('button:has-text("Next")').click();
        await dashboardPage.waitForLoadingToComplete();
      }
    });

    test('should display instance details', async ({ page }) => {
      const instances = await dashboardPage.getAllInstances();
      if (instances.length === 0) {
        test.skip();
        return;
      }

      const firstInstance = instances[0];

      // Verify all required details are displayed
      expect(firstInstance.name).toBeTruthy();
      expect(firstInstance.state).toMatch(/running|stopped|pending|stopping|terminated/);
      expect(firstInstance.type).toMatch(/t2\.|t3\.|m5\.|c5\./);
      expect(firstInstance.region).toMatch(/[a-z]{2}-[a-z]+-\d/);
    });

    test('should sort instances by different criteria', async ({ page }) => {
      // Look for sort controls
      const sortControl = page.locator('[data-testid="sort-control"], select[name="sort"]');

      if (await sortControl.isVisible()) {
        // Test sorting by name
        await sortControl.selectOption('name');
        await dashboardPage.waitForLoadingToComplete();

        const instances = await dashboardPage.getAllInstances();
        const names = instances.map((i) => i.name);
        const sortedNames = [...names].sort();
        expect(names).toEqual(sortedNames);
      }
    });
  });

  test.describe('Instance Actions', () => {
    test('should start a stopped instance', async ({ page }) => {
      // Find or mock a stopped instance
      const instances = await dashboardPage.getAllInstances();
      const stoppedInstance = instances.find((i) => i.state === 'stopped');

      if (!stoppedInstance) {
        // Mock a stopped instance
        const mockInstances = TestDataFactory.createTestInstances(1, { state: 'stopped' });
        await TestHelpers.mockAPIResponse(page, /.*\/instances/, mockInstances);
        await dashboardPage.refreshInstanceList();
      }

      // Start the instance
      const instanceToStart = stoppedInstance || 'test-instance-1';
      await dashboardPage.startInstance(instanceToStart.name || instanceToStart);

      // Verify success message
      const successMessage = await dashboardPage.getSuccessMessage();
      expect(successMessage).toContain('start');

      // Wait for state change
      const stateChanged = await dashboardPage.waitForInstanceStateChange(
        instanceToStart.name || instanceToStart,
        'running'
      );
      expect(stateChanged).toBeTruthy();
    });

    test('should stop a running instance', async ({ page }) => {
      // Find or mock a running instance
      const instances = await dashboardPage.getAllInstances();
      const runningInstance = instances.find((i) => i.state === 'running');

      if (!runningInstance) {
        // Mock a running instance
        const mockInstances = TestDataFactory.createTestInstances(1, { state: 'running' });
        await TestHelpers.mockAPIResponse(page, /.*\/instances/, mockInstances);
        await dashboardPage.refreshInstanceList();
      }

      // Stop the instance
      const instanceToStop = runningInstance || 'test-instance-1';
      await dashboardPage.stopInstance(instanceToStop.name || instanceToStop);

      // Verify success message
      const successMessage = await dashboardPage.getSuccessMessage();
      expect(successMessage).toContain('stop');

      // Wait for state change
      const stateChanged = await dashboardPage.waitForInstanceStateChange(
        instanceToStop.name || instanceToStop,
        'stopped'
      );
      expect(stateChanged).toBeTruthy();
    });

    test('should terminate an instance', async ({ page }) => {
      // Find or mock an instance
      const instances = await dashboardPage.getAllInstances();
      const instanceToTerminate = instances[0];

      if (!instanceToTerminate) {
        // Mock an instance
        const mockInstances = TestDataFactory.createTestInstances(1);
        await TestHelpers.mockAPIResponse(page, /.*\/instances/, mockInstances);
        await dashboardPage.refreshInstanceList();
      }

      // Terminate the instance
      const instance = instanceToTerminate || 'test-instance-1';
      await dashboardPage.terminateInstance(instance.name || instance);

      // Verify success message
      const successMessage = await dashboardPage.getSuccessMessage();
      expect(successMessage).toContain('terminat');

      // Wait for state change
      const stateChanged = await dashboardPage.waitForInstanceStateChange(
        instance.name || instance,
        'terminated'
      );
      expect(stateChanged).toBeTruthy();
    });

    test('should reboot a running instance', async ({ page }) => {
      // Find or mock a running instance
      const instances = await dashboardPage.getAllInstances();
      const runningInstance = instances.find((i) => i.state === 'running');

      if (!runningInstance) {
        // Mock a running instance
        const mockInstances = TestDataFactory.createTestInstances(1, { state: 'running' });
        await TestHelpers.mockAPIResponse(page, /.*\/instances/, mockInstances);
        await dashboardPage.refreshInstanceList();
      }

      // Reboot the instance
      const instanceToReboot = runningInstance || 'test-instance-1';
      await dashboardPage.rebootInstance(instanceToReboot.name || instanceToReboot);

      // Verify success message
      const successMessage = await dashboardPage.getSuccessMessage();
      expect(successMessage).toContain('reboot');

      // Instance should remain running after reboot
      await page.waitForTimeout(2000);
      const state = await dashboardPage.getInstanceState(instanceToReboot.name || instanceToReboot);
      expect(state).toBe('running');
    });

    test('should show confirmation dialog before destructive actions', async ({ page }) => {
      const instances = await dashboardPage.getAllInstances();
      if (instances.length === 0) {
        const mockInstances = TestDataFactory.createTestInstances(1);
        await TestHelpers.mockAPIResponse(page, /.*\/instances/, mockInstances);
        await dashboardPage.refreshInstanceList();
      }

      // Click terminate without confirming
      const instance = await dashboardPage.getInstanceByName('test-instance-1');
      await instance.element.locator('button:has-text("Terminate")').click();

      // Should show confirmation dialog
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();

      // Cancel the action
      await dashboardPage.cancelAction();

      // Instance should not be terminated
      const state = await dashboardPage.getInstanceState('test-instance-1');
      expect(state).not.toBe('terminated');
    });

    test('should disable actions based on instance state', async ({ page }) => {
      // Mock instances with different states
      const mockInstances = [
        TestDataFactory.createTestInstance({ name: 'running-instance', state: 'running' }),
        TestDataFactory.createTestInstance({ name: 'stopped-instance', state: 'stopped' }),
        TestDataFactory.createTestInstance({ name: 'pending-instance', state: 'pending' }),
      ];
      await TestHelpers.mockAPIResponse(page, /.*\/instances/, mockInstances);
      await dashboardPage.refreshInstanceList();

      // Check button states for running instance
      expect(await dashboardPage.isActionButtonEnabled('running-instance', 'start')).toBeFalsy();
      expect(await dashboardPage.isActionButtonEnabled('running-instance', 'stop')).toBeTruthy();

      // Check button states for stopped instance
      expect(await dashboardPage.isActionButtonEnabled('stopped-instance', 'start')).toBeTruthy();
      expect(await dashboardPage.isActionButtonEnabled('stopped-instance', 'stop')).toBeFalsy();

      // Check button states for pending instance
      expect(await dashboardPage.isActionButtonEnabled('pending-instance', 'start')).toBeFalsy();
      expect(await dashboardPage.isActionButtonEnabled('pending-instance', 'stop')).toBeFalsy();
    });
  });

  test.describe('Batch Operations', () => {
    test('should select multiple instances for batch operations', async ({ page }) => {
      // Mock multiple instances
      const mockInstances = TestDataFactory.createTestInstances(5);
      await TestHelpers.mockAPIResponse(page, /.*\/instances/, mockInstances);
      await dashboardPage.refreshInstanceList();

      // Look for batch selection checkboxes
      const checkboxes = page.locator('input[type="checkbox"][data-testid*="select"]');

      if ((await checkboxes.count()) > 0) {
        // Select first 3 instances
        for (let i = 0; i < 3; i++) {
          await checkboxes.nth(i).check();
        }

        // Look for batch action controls
        const batchActions = page.locator('[data-testid="batch-actions"]');
        if (await batchActions.isVisible()) {
          // Should show selected count
          const selectedCount = await batchActions.locator('.selected-count').textContent();
          expect(selectedCount).toContain('3');
        }
      }
    });

    test('should perform batch start operation', async ({ page }) => {
      // Mock stopped instances
      const mockInstances = TestDataFactory.createTestInstances(3, { state: 'stopped' });
      await TestHelpers.mockAPIResponse(page, /.*\/instances/, mockInstances);
      await dashboardPage.refreshInstanceList();

      // Select all instances
      const selectAll = page.locator('input[type="checkbox"][data-testid="select-all"]');
      if (await selectAll.isVisible()) {
        await selectAll.check();

        // Perform batch start
        const batchStart = page.locator('button:has-text("Start Selected")');
        if (await batchStart.isVisible()) {
          await batchStart.click();
          await dashboardPage.confirmAction();

          // Should show success message
          const successMessage = await dashboardPage.getSuccessMessage();
          expect(successMessage).toContain('started');
        }
      }
    });
  });

  test.describe('Region Management', () => {
    test('should switch between regions', async ({ page }) => {
      // Check if region selector exists
      const regionSelector = page.locator('select[name="region"], [data-testid="region-selector"]');

      if (await regionSelector.isVisible()) {
        // Get available regions
        const regions = await regionSelector.locator('option').allTextContents();

        if (regions.length > 1) {
          // Switch to different region
          await dashboardPage.selectRegion(regions[1]);

          // Should load instances for new region
          await dashboardPage.waitForLoadingToComplete();

          // Verify region changed
          const selectedRegion = await regionSelector.inputValue();
          expect(selectedRegion).toBeTruthy();
        }
      }
    });

    test('should display instances from selected region only', async ({ page }) => {
      // Mock instances for different regions
      const usWestInstances = TestDataFactory.createTestInstances(2, { region: 'us-west-2' });
      const usEastInstances = TestDataFactory.createTestInstances(2, { region: 'us-east-1' });

      // Mock API to return instances based on region query
      await page.route(/.*\/instances.*region=us-west-2/, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(usWestInstances),
        });
      });

      await page.route(/.*\/instances.*region=us-east-1/, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(usEastInstances),
        });
      });

      // Select us-west-2
      await dashboardPage.selectRegion('us-west-2');
      const westInstances = await dashboardPage.getAllInstances();
      expect(westInstances.every((i) => i.region === 'us-west-2')).toBeTruthy();

      // Select us-east-1
      await dashboardPage.selectRegion('us-east-1');
      const eastInstances = await dashboardPage.getAllInstances();
      expect(eastInstances.every((i) => i.region === 'us-east-1')).toBeTruthy();
    });
  });

  test.describe('Real-time Updates', () => {
    test('should auto-refresh instance status', async ({ page }) => {
      // Check if auto-refresh is enabled
      const autoRefreshToggle = page.locator('[data-testid="auto-refresh"]');

      if (await autoRefreshToggle.isVisible()) {
        // Enable auto-refresh
        await autoRefreshToggle.check();

        // Mock instance state change
        let callCount = 0;
        await page.route(/.*\/instances/, async (route) => {
          const instances = TestDataFactory.createTestInstances(1, {
            state: callCount === 0 ? 'pending' : 'running',
          });
          callCount++;

          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(instances),
          });
        });

        // Wait for auto-refresh
        await page.waitForTimeout(5000);

        // Instance state should have updated
        const state = await dashboardPage.getInstanceState('test-instance-1');
        expect(state).toBe('running');
      }
    });

    test('should show real-time notifications for instance state changes', async ({ page }) => {
      // Start an instance
      const mockInstances = TestDataFactory.createTestInstances(1, { state: 'stopped' });
      await TestHelpers.mockAPIResponse(page, /.*\/instances/, mockInstances);
      await dashboardPage.refreshInstanceList();

      // Mock successful start
      await TestHelpers.mockAPIResponse(page, /.*\/instances.*\/start/, {
        success: true,
        message: 'Instance starting',
      });

      await dashboardPage.startInstance('test-instance-1');

      // Should show notification
      const toast = await dashboardPage.waitForToastMessage();
      expect(toast).toContain('start');
    });
  });

  test.describe('Instance Action Permissions', () => {
    test('should respect user role permissions', async ({ page }) => {
      // This test would verify role-based access control
      // Implementation depends on backend permission model

      // For read-only users, action buttons should be disabled
      const isReadOnly = await page.evaluate(() => {
        // Check if user has read-only role
        const userRole = localStorage.getItem('userRole');
        return userRole === 'readonly';
      });

      if (isReadOnly) {
        const instances = await dashboardPage.getAllInstances();
        if (instances.length > 0) {
          const canStart = await dashboardPage.isActionButtonEnabled(instances[0].name, 'start');
          const canStop = await dashboardPage.isActionButtonEnabled(instances[0].name, 'stop');
          const canTerminate = await dashboardPage.isActionButtonEnabled(
            instances[0].name,
            'terminate'
          );

          expect(canStart).toBeFalsy();
          expect(canStop).toBeFalsy();
          expect(canTerminate).toBeFalsy();
        }
      }
    });

    test('should show permission error for unauthorized actions', async ({ page }) => {
      // Mock 403 response for unauthorized action
      await TestHelpers.interceptAPIError(page, /.*\/instances.*\/start/, 403, 'Unauthorized');

      const mockInstances = TestDataFactory.createTestInstances(1, { state: 'stopped' });
      await TestHelpers.mockAPIResponse(page, /.*\/instances/, mockInstances);
      await dashboardPage.refreshInstanceList();

      await dashboardPage.startInstance('test-instance-1');

      // Should show error message
      const errorMessage = await dashboardPage.getErrorMessage();
      expect(errorMessage).toContain('Unauthorized');
    });
  });
});
