import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir: '.', testMatch: 'listening-state.unit.ts', workers: 1 });
