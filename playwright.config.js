import { defineConfig } from '@playwright/test';

const testBasePath = process.env.TEST_BASE_PATH || '/';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  globalSetup: './tests/global-setup.js',
  use: {
    baseURL: `http://127.0.0.1:4173${testBasePath}`,
    browserName: 'chromium',
    trace: 'retain-on-failure',
  },
});
