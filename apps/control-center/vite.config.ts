import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, '../../ui'),
      '@beehive/sdk': resolve(__dirname, '../../packages/sdk/src'),
      '@beehive/shared': resolve(__dirname, '../../packages/shared/src'),
    },
  },
  server: {
    port: 3000,
  },
});
