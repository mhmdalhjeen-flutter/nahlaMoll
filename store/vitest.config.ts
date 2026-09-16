import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  esbuild: {
    jsxInject: `import React from 'react'`,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts', 'src/**/*.spec.tsx'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
