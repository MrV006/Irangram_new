
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Use './' to ensure assets are loaded correctly regardless of the domain (GitHub Pages or Cloudflare)
  base: './', 
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    // Increase chunk size limit to avoid warnings
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Separate vendor chunks for better caching and speed
        manualChunks(id) {
            if (id.includes('node_modules')) {
                return 'vendor';
            }
        }
      }
    }
  },
  server: {
    port: 3000,
    open: true,
  }
});
