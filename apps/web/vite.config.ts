import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// Configuração do Vite (ferramenta de desenvolvimento/build do frontend).
// O alias '@' aponta para 'src', mantendo imports limpos e desacoplados da
// profundidade de pastas.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
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
});
