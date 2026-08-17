import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    // keep the demo build out of dist/, which belongs to the library (tsup)
    outDir: 'dist-demo',
  },
});
