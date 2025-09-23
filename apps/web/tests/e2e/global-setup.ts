import { chromium, FullConfig } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

/**
 * Global setup for Playwright tests
 * This runs once before all tests start
 */
async function globalSetup(_config: FullConfig) {
  // Load environment variables from .env.test file
  dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });

  // Validate required environment variables
  const requiredEnvVars = ['E2E_TEST_EMAIL', 'E2E_TEST_PASSWORD'];
  const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

  if (missingEnvVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingEnvVars.forEach(envVar => {
      console.error(`   - ${envVar}`);
    });
    console.error('\nPlease create a .env.test file based on .env.test.example');
    process.exit(1);
  }

  console.log('✅ Environment variables validated');
  console.log(`📧 Test email: ${process.env.E2E_TEST_EMAIL}`);
  const baseUrl = process.env.E2E_BASE_URL || 'https://d2pbh2fudgytg0.cloudfront.net';
  console.log(`🌐 Base URL: ${baseUrl}`);

  // Optional: Pre-warm the browser or perform other setup tasks
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Test if the application is reachable
    await page.goto(baseUrl);
    console.log('✅ Application is reachable');
  } catch (error) {
    console.error('❌ Failed to reach application:', error);
  } finally {
    await browser.close();
  }
}

export default globalSetup;