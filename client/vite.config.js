import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    // Forward API calls to the Express backend during local development.
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
