import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  // Serve from './' so PWA assets resolve correctly in subdirectory deployments
  base: './',

  build: {
    rollupOptions: {
      // These packages are provided by the importmap in index.html.
      // They must not be bundled into the output — import statements are kept as-is.
      external: [
        'react',
        'react-dom',
        'react-dom/client',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
      ],
      output: {
        // Preserve the src/ module structure in the build output.
        // Each source file becomes a corresponding .js file under dist/src/.
        preserveModules: true,
        preserveModulesRoot: 'src',
        entryFileNames: '[name].js',
        format: 'esm',
      },
    },
  },
});
