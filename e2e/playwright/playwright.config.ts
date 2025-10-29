import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './',
  timeout: 30_000,
  expect: { timeout: 5000 },
  retries: 0,
  use: {
    headless: true,
    viewport: { width: 1280, height: 800 },
    actionTimeout: 5000,
    ignoreHTTPSErrors: true,
  },
  webServer: {
    command: 'npx ng serve --port 4300',
    url: 'http://localhost:4300',
    timeout: 120_000,
    reuseExistingServer: true,
  },
  globalSetup: undefined,
  outputDir: 'e2e/playwright/test-results',
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
});
