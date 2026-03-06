import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      // Use our hand-written sw.js as the source; Workbox injects __WB_MANIFEST into it.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',

      // Output sw.js to the dist root (default).
      // The injected manifest covers all files Vite emits.
      injectManifest: {
        // sw.js itself must not be listed in its own cache manifest.
        globIgnores: ['sw.js'],
      },

      // Keep manifest.json managed by us (already in public/).
      manifest: false,
    }),
  ],

  // Serve from './' so PWA assets resolve correctly in subdirectory deployments
  base: './',

  build: {
    // Disable all minification for readable output
    minify: false,
    // Preserve original symbol names (no identifier mangling)
    terserOptions: { mangle: false },

    rollupOptions: {
      // These packages are provided by the importmap in index.html.
      // They must not be bundled into the output — import statements are kept as-is.
      external: [
        'react',
        'react-dom',
        'react-dom/client',
        'motion',
        'motion/react',
      ],
      // preserveModules requires preserveEntrySignatures to be non-false.
      // Vite sets it to false by default, so we override it here.
      preserveEntrySignatures: 'allow-extension',
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
