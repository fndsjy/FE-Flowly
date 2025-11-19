import { defineConfig } from 'vite'
import restart from 'vite-plugin-restart';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    restart({
      restart: ['src/**/*.{ts,tsx}'],
    }),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5174/v1',
        changeOrigin: true,
        secure: false,
        // Opsional: rewrite path jika perlu
        // rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  // plugins: [react()],
})
