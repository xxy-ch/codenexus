import { defineConfig, type PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
  testDir: './e2e',
  // The webServer will be configured by CI workflow
  // For local development, webServer can be started separately
  fullyParallel: false, // Run tests sequentially for better debugging
  timeout: 10000, // 10 second timeout per test
  retries: 0, // No retries for now
  use: {
    headless: true,
    channel: 'chrome',
    // Use headed mode for local debugging if needed
  },
  reporter: [
    ['html'], // HTML reporter
    ['list'] // Console reporter
  ],
};

export default defineConfig(config);
