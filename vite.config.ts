import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { cwd } from 'node:process';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, cwd(), '');
  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.VITE_API_KEY || env.API_KEY || ''),
      'process.env.GOOGLE_CLIENT_ID': JSON.stringify(env.VITE_GOOGLE_CLIENT_ID || env.GOOGLE_CLIENT_ID || '')
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      target: 'esnext'
    },
    optimizeDeps: {
      include: ['pdfjs-dist']
    }
  };
});
