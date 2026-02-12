import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          if (id.includes('xlsx')) return 'xlsx';
          if (id.includes('konva') || id.includes('react-konva')) return 'konva';
          if (id.includes('framer-motion') || id.includes('motion-dom') || id.includes('motion-utils')) return 'motion';
          if (id.includes('recharts') || id.includes('d3-')) return 'charts';

          if (id.includes('lucide-react')) return 'icons';

          // Router depends on React; keep it isolated but let Rollup handle remaining deps to avoid cycles.
          if (id.includes('react-router') || id.includes('@remix-run/router')) return 'router';

          // Let Rollup decide the rest (prevents circular chunk graph between an artificial 'vendor' chunk and others).
          return;
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/media': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
