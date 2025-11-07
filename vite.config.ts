import { defineConfig } from 'vite'
import restart from 'vite-plugin-restart';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    restart({
      restart: ['src/**/*.{ts,tsx}'],
    }),
  ],
  // plugins: [react()],
})
