/**
 * Build vendor ESM bundles from node_modules into public/vendor/.
 *
 * Run automatically as part of `npm run build` via the `prebuild` script.
 * Each package is bundled as a self-contained ESM file so that the importmap
 * in index.html can resolve bare specifiers to local paths instead of a CDN.
 *
 * CJS-only packages (React, react-dom, dayjs) are converted to ESM via
 * @rollup/plugin-commonjs. Named exports are explicitly re-exported so that
 * `import { useState } from 'react'` works at runtime.
 */

import { rollup } from 'rollup'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import replace from '@rollup/plugin-replace'
import virtual from '@rollup/plugin-virtual'
import { mkdirSync, readFileSync, appendFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import { createRequire } from 'module'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const outDir = resolve(root, 'public/vendor')
const require = createRequire(import.meta.url)

mkdirSync(outDir, { recursive: true })

/**
 * Build shared plugins. replace() must run before commonjs() so that the
 * dead-code branches that reference process.env.NODE_ENV are removed before
 * CJS analysis.
 */
function makePlugins(virtualEntries) {
  return [
    ...(virtualEntries ? [virtual(virtualEntries)] : []),
    replace({
      preventAssignment: true,
      values: { 'process.env.NODE_ENV': JSON.stringify('production') },
    }),
    nodeResolve({
      browser: true,
      exportConditions: ['import', 'module', 'browser', 'default'],
    }),
    commonjs(),
  ]
}

/**
 * Rewrite external bare specifiers to relative vendor paths so bundles are
 * self-consistent when served offline (importmap handles the same mapping at
 * the HTML level).
 */
const outputPaths = {
  react:            '../vendor/react.js',
  'react-dom':      '../vendor/react-dom.js',
  motion:           '../vendor/motion.js',
  'motion/react':   '../vendor/motion.js',
  dayjs:            '../vendor/dayjs.js',
}

/**
 * After bundling a CJS package, append explicit named re-exports so that
 * `import { useState } from 'react'` etc. resolve correctly at runtime.
 * rollup's commonjs plugin wraps the CJS object as a default export only;
 * we patch the file to also expose each individual export name.
 *
 * @param {string} filePath  – path to the just-written vendor file
 * @param {string} pkg       – bare specifier used to require() the module
 */
function appendNamedExports(filePath, pkg) {
  const mod = require(pkg)
  const names = Object.keys(mod).filter(
    (k) => k !== '__esModule' && k !== 'default' && /^[a-zA-Z_$][\w$]*$/.test(k)
  )
  if (!names.length) return

  // The commonjs wrapper stores the exports as `<pkgVar>Exports`, e.g. reactExports.
  // Read the file to find the actual variable name.
  const src = readFileSync(filePath, 'utf8')
  const match = src.match(/var (\w+Exports) = require\w+\(\)/)
  if (!match) return
  const exportsVar = match[1]

  const lines = [
    '',
    '// Named re-exports for ESM consumers',
    `const { ${names.join(', ')} } = ${exportsVar};`,
    `export { ${names.join(', ')} };`,
    '',
  ]
  appendFileSync(filePath, lines.join('\n'))
}

// ── Entry definitions ─────────────────────────────────────────────────────────

/**
 * motion/react is `export * from 'framer-motion'; export { m, motion }`.
 * framer-motion is the same npm package as motion (just a peer alias).
 * We build both through a single virtual entry so framer-motion internals are
 * inlined once and react stays external — no chunk splitting, no duplication.
 */
const MOTION_VIRTUAL_ENTRY = '__motion_entry__'
const motionVirtual = {
  [MOTION_VIRTUAL_ENTRY]: `
export * from 'motion';
export * from 'motion/react';
`,
}

const entries = [
  // ── React core ──────────────────────────────────────────────────────────────
  {
    name: 'react',
    input: 'react',
    appendNamed: 'react',
  },
  {
    name: 'react-dom',
    input: 'react-dom',
    external: ['react'],
    appendNamed: 'react-dom',
  },
  {
    name: 'react-dom-client',
    input: 'react-dom/client',
    external: ['react', 'react-dom'],
    appendNamed: 'react-dom/client',
  },

  // ── Animation ───────────────────────────────────────────────────────────────
  // Virtual entry bundles motion + motion/react together as one ESM file.
  // framer-motion is treated as an internal of motion (not external) so the
  // shared implementation is included once without chunk splitting.
  {
    name: 'motion',
    input: MOTION_VIRTUAL_ENTRY,
    virtual: motionVirtual,
    external: ['react'],
  },

  // ── Pattern matching ────────────────────────────────────────────────────────
  { name: 'ts-pattern', input: 'ts-pattern' },

  // ── Date/time ───────────────────────────────────────────────────────────────
  { name: 'dayjs',          input: 'dayjs',                  appendNamed: 'dayjs' },
  { name: 'dayjs-utc',      input: 'dayjs/plugin/utc',      external: ['dayjs'] },
  { name: 'dayjs-timezone', input: 'dayjs/plugin/timezone', external: ['dayjs'] },
]

// ── Build loop ────────────────────────────────────────────────────────────────

for (const entry of entries) {
  process.stdout.write(`  building ${entry.name}.js … `)

  const bundle = await rollup({
    input: entry.input,
    external: entry.external ?? [],
    plugins: makePlugins(entry.virtual ?? null),
    onwarn(warning, warn) {
      // Silence "use client" directive warnings from framer-motion / motion
      if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return
      // Silence eval warnings from dayjs timezone plugin
      if (warning.code === 'EVAL') return
      warn(warning)
    },
  })

  const outFile = `${outDir}/${entry.name}.js`
  await bundle.write({
    file: outFile,
    format: 'esm',
    paths: outputPaths,
  })
  await bundle.close()

  // Append named re-exports for CJS packages so `import { useState }` works.
  if (entry.appendNamed) {
    appendNamedExports(outFile, entry.appendNamed)
  }

  console.log('done')
}

console.log('\nVendor bundles written to public/vendor/')
