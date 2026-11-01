import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  base: '/B-/',
  build: {
    rollupOptions: {
      input: {
        legacy: fileURLToPath(new URL('./index.html', import.meta.url)),
        rezero: fileURLToPath(new URL('./rezero.html', import.meta.url))
      }
    }
  }
});
