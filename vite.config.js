import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

// Generate a unique 8-character hex hash for this build.
// A SHA-1 of the current timestamp is sufficient — the only requirement is
// that every deployment produces a value different from the previous one so
// the new SW gets a distinct cache bucket and cannot partially overwrite the
// old one while the old SW is still active.
const buildHash = createHash('sha1')
  .update(Date.now().toString())
  .digest('hex')
  .slice(0, 8)

/**
 * Replaces the __BUILD_HASH__ placeholder in the compiled dist/sw.js with
 * the actual build hash.  This plugin must be placed AFTER VitePWA in the
 * plugins array so it runs after Workbox has already injected __WB_MANIFEST.
 */
function replaceBuildHash(hash) {
  return {
    name: 'replace-build-hash',
    apply: 'build',
    closeBundle() {
      const swPath = resolve('dist', 'sw.js')
      if (!existsSync(swPath)) return
      const patched = readFileSync(swPath, 'utf-8').replace(
        /__BUILD_HASH__/g,
        hash
      )
      writeFileSync(swPath, patched, 'utf-8')
    },
  }
}

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
        // Extend the default pattern to include JSON files (e.g. version.json, locales).
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest,json}'],
      },

      // Keep manifest.json managed by us (already in public/).
      manifest: false,
    }),

    // Must come after VitePWA so __WB_MANIFEST is already injected when this runs.
    replaceBuildHash(buildHash),
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
})
