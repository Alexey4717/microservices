import react from '@vitejs/plugin-react';
import { defineConfig, searchForWorkspaceRoot } from 'vite';

const graphqlProxy = {
  '/graphql': {
    target: 'http://localhost:3000',
    changeOrigin: true,
  },
};

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 4001,
    strictPort: true,
    fs: {
      allow: [searchForWorkspaceRoot(import.meta.dirname)],
    },
    // ngrok hostname changes every restart; Vite 6+ otherwise 403s Telegram WebView.
    allowedHosts: true,
    proxy: graphqlProxy,
  },
  preview: {
    host: '127.0.0.1',
    port: 4001,
    strictPort: true,
    allowedHosts: true,
    proxy: graphqlProxy,
  },
});
