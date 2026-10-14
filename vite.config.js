import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: false,
    // The Firestore SDK alone is ~560 kB (~167 kB gzip); it is needed for realtime sync
    // and offline cache (firestore/lite has neither), so allow it as one vendor chunk.
    chunkSizeWarningLimit: 600,
    rolldownOptions: {
      output: {
        // Separate long-lived vendor chunks so app changes don't invalidate them.
        codeSplitting: {
          groups: [
            { name: 'firebase', test: /node_modules[\\/]@?firebase/ },
            { name: 'mui', test: /node_modules[\\/]@(mui|emotion)/ },
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
          ],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    // Live tests hit the real Firestore in .env; run them only via `npm run test:live`.
    exclude: ['**/node_modules/**', '**/dist/**', ...(process.env.LIVE ? [] : ['**/*.live.test.js'])],
    css: false,
    testTimeout: 15000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/main.jsx', 'src/test/**'],
    },
  },
});
