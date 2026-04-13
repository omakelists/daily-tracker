/**
 * Build vendor ESM bundles from node_modules into public/vendor/.
 *
 * Run automatically as part of `npm run build` via the `prebuild` script.
 * Each entry is bundled as a self-contained ESM file so that the importmap
 * in index.html can resolve bare specifiers to local paths instead of a CDN.
 *
 * Packages that are already ESM-native are passed through with minimal
 * transformation. CJS-only packages (React, react-dom, dayjs) are converted
 * to ESM via @rollup/plugin-commonjs, with process.env.NODE_ENV replaced to
 * select the production build.
 */

import { rollup } from 'rollup'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import replace from '@rollup/plugin-replace'
import { mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const outDir = resolve(root, 'public/vendor')

mkdirSync(outDir, { recursive: true })

/**
 * Shared plugins used for all entries.
 * replace() must run before commonjs() so that the dead-code branches that
 * reference process.env.NODE_ENV are removed before CJS analysis.
 */
const sharedPlugins = [
  replace({
    preventAssignment: true,
    values: { 'process.env.NODE_ENV': JSON.stringify('production') },
  }),
  nodeResolve({ browser: true, exportConditions: ['import', 'module', 'browser', 'default'] }),
  commonjs(),
]

/**
 * Vendor entry definitions.
 *
 * `name`     – output filename (without .js)
 * `input`    – bare package specifier passed to rollup as the entry
 * `external` – packages that should NOT be bundled (resolved via importmap)
 * `globals`  – importmap key for each external (used in UMD, not needed here)
 */
const entries = [
  // ── React core ────────────────────────────────────────────────────────────
  { name: 'react',            input: 'react' },
  { name: 'react-dom',        input: 'react-dom',        external: ['react'] },
  { name: 'react-dom-client', input: 'react-dom/client', external: ['react', 'react-dom'] },

  // ── Animation ─────────────────────────────────────────────────────────────
  // motion/react re-exports from 'framer-motion' (an alias for the same package).
  // We build both motion and motion/react into a single file so that framer-motion
  // internals are bundled once and react stays external.
  {
    name: 'motion',
    input: ['motion', 'motion/react'],
    external: ['react'],
  },

  // ── Pattern matching ──────────────────────────────────────────────────────
  { name: 'ts-pattern', input: 'ts-pattern' },

  // ── Date/time ─────────────────────────────────────────────────────────────
  // dayjs core ships CJS; plugins are thin CJS wrappers that call dayjs.extend().
  { name: 'dayjs',          input: 'dayjs' },
  { name: 'dayjs-utc',      input: 'dayjs/plugin/utc',      external: ['dayjs'] },
  { name: 'dayjs-timezone', input: 'dayjs/plugin/timezone', external: ['dayjs'] },
]

for (const entry of entries) {
  process.stdout.write(`  building ${entry.name}.js … `)

  const isMultiEntry = Array.isArray(entry.input)

  const bundle = await rollup({
    input: isMultiEntry
      // Multi-entry: use an object map so rollup knows what to name each chunk.
      // Both 'motion' and 'motion/react' are bundled into one file via exports.
      ? Object.fromEntries(entry.input.map((id) => [id, id]))
      : entry.input,
    external: entry.external ?? [],
    plugins: sharedPlugins,
    // Suppress "use of eval" warning from some packages (e.g. dayjs timezone)
    onwarn(warning, warn) {
      if (warning.code === 'EVAL') return
      warn(warning)
    },
  })

  // Rewrite external bare specifiers to the relative paths used by the
  // importmap so the bundles are self-consistent offline.
  const outputPaths = {
    react:       '../vendor/react.js',
    'react-dom': '../vendor/react-dom.js',
    motion:      '../vendor/motion.js',
    dayjs:       '../vendor/dayjs.js',
  }

  if (isMultiEntry) {
    // Multi-entry: generate chunks into a temp dir, then inline them into one
    // flat ESM file so the importmap can reference a single local path.
    const tmpDir = `${outDir}/_tmp_${entry.name}`
    await bundle.write({
      dir: tmpDir,
      format: 'esm',
      paths: outputPaths,
      // Flatten chunk names so there are no sub-directories.
      chunkFileNames: '[name]-[hash].js',
    })
    // Concatenate all chunk files into one self-contained bundle.
    const { readdirSync, readFileSync, writeFileSync, rmSync } = await import('fs')
    const allFiles = readdirSync(tmpDir, { recursive: true })
      .filter((f) => typeof f === 'string' && f.endsWith('.js'))
      .map((f) => `${tmpDir}/${f}`)
    const combined = allFiles.map((f) => readFileSync(f, 'utf8')).join('\n')
    writeFileSync(`${outDir}/${entry.name}.js`, combined)
    rmSync(tmpDir, { recursive: true, force: true })
  } else {
    await bundle.write({
      file: `${outDir}/${entry.name}.js`,
      format: 'esm',
      paths: outputPaths,
    })
  }

  await bundle.close()
  console.log('done')
}

console.log('\nVendor bundles written to public/vendor/')
