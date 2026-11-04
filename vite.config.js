import { defineConfig } from 'vite';

// base を相対パスにしておくと、同じ dist を Web にも Electron（file://）にも使える
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    outDir: 'dist',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 1200,
  },
  server: { host: true },
});
