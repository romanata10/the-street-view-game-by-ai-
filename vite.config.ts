import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
  },
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) return 'panorama-engine';
          if (id.includes('node_modules/leaflet')) return 'map-engine';
          if (id.includes('node_modules/react')) return 'react-vendor';
        },
      },
    },
  },
});
