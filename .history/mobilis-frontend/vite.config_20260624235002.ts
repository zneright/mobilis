import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Put Stellar SDK in its own chunk
            if (id.includes('@stellar')) return 'stellar-sdk';
            // Put Firebase in its own chunk
            if (id.includes('firebase')) return 'firebase-sdk';
            // Put React in its own chunk
            if (id.includes('react')) return 'react-vendor';
            // Put everything else in a general vendor chunk
            return 'vendor';
          }
        }
      }
    }
  }
});