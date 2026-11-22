import { defineConfig, devices } from '@playwright/test';

/**
 * Prueba de portabilidad (adaptabilidad): las mismas pruebas en los tres motores
 * de navegador (Chromium, Gecko y WebKit), en escritorio y en un celular.
 * Requiere el frontend en localhost:3001 y el backend en localhost:3000.
 */
export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'reporte' }]],
  use: {
    baseURL: process.env.REMI_URL ?? 'http://localhost:3001',
    locale: 'es-CO',
    screenshot: 'on',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'Chrome escritorio', use: { ...devices['Desktop Chrome'] } },
    { name: 'Firefox escritorio', use: { ...devices['Desktop Firefox'] } },
    { name: 'Safari iPhone 14', use: { ...devices['iPhone 14'] } },
  ],
});
