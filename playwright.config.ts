import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'off',
    reducedMotion: 'reduce',
    launchOptions: { executablePath: process.env.CHROMIUM_PATH || undefined }
  },
  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    timeout: 120000
  },
  projects: [{ name: 'pixel5', use: { ...devices['Pixel 5'], browserName: 'chromium' } }]
});
