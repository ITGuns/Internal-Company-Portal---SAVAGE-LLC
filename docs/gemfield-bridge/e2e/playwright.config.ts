import { defineConfig, devices } from '@playwright/test'

// Ready-to-wire Playwright config for the Gemfield E2E (see README.md in this folder).
// It lives under docs/ so it never affects the app build; move it to frontend/e2e/ to run.
export default defineConfig({
  testDir: '.',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    // The guide requires the wizard end-to-end on a mobile viewport.
    { name: 'mobile', use: { ...devices['iPhone 13'] } },
  ],
})
