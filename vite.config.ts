import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    // 把体积最大的两个库拆出来，首屏只加载需要的部分
    rollupOptions: {
      output: {
        manualChunks: {
          charts: ['lightweight-charts'],
          vendor: ['react', 'react-dom'],
        },
      },
    },
  },
});
