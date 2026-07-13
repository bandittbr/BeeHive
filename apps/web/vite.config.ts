/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// Configuração do Vite (ferramenta de desenvolvimento/build do frontend).
// O alias '@' aponta para 'src', mantendo imports limpos e desacoplados da
// profundidade de pastas. O bloco `test` configura o Vitest.
const isVitest = !!process.env.VITEST;

// No browser, os builtins do Node não existem. Como o @beehive/platform é
// compartilhado com o backend, alguns módulos server-only importam `node:*`.
// Resolver para um stub (no-op) só no build/dev — os testes (vitest, em Node)
// continuam usando os builtins reais.
const nodeStubAlias = {
  find: /^node:.*/,
  replacement: fileURLToPath(new URL('./src/shims/nodeBuiltins.ts', import.meta.url)),
};

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
      ...(isVitest ? [] : [nodeStubAlias]),
    ],
  },
  server: {
    port: 5173,
    open: true,
    // Encaminha as chamadas /api para o backend (Core) em desenvolvimento,
    // evitando CORS. A porta deve casar com PORT do apps/api (.env). `ws: true`
    // também encaminha o WebSocket de eventos do Runtime (Sprint 12).
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        ws: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
});
