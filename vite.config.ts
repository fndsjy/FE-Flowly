import { defineConfig, loadEnv } from 'vite';
import restart from 'vite-plugin-restart';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiProxyBase = {
    target: env.VITE_BACKEND,
    changeOrigin: true,
    secure: false,
  };
  const apiOmsRewrite = (path: string) => path.replace(/^\/apioms/, "/v1/api");
  const apiRewrite = (path: string) => path.replace(/^\/api/, "/v1/api");

  return {
    base: `/oms/`,
    plugins: [
      restart({
        restart: ['src/**/*.{ts,tsx}'],
      }),
    ],
    server: {
      host: "0.0.0.0",
      port: 5173,
      proxy: {
        "/apioms": {
          ...apiProxyBase,
          rewrite: apiOmsRewrite,
        },
        "/api": {
          ...apiProxyBase,
          rewrite: apiRewrite,
        },
      },
    },
  };
});
