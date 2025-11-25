import { defineConfig, loadEnv } from 'vite';
import restart from 'vite-plugin-restart';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      restart({
        restart: ['src/**/*.{ts,tsx}'],
      }),
    ],
    server: {
      host: "0.0.0.0",
      port: 5173,
      proxy: {
        '/api': {
          target: `${env.VITE_BACKEND}/v1`,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
