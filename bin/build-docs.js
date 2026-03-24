#!/usr/bin/env bun
/**
 * chatops.js documentation builder
 * Reads page definitions from docs/src/pages/, wraps them in the base
 * template, and writes finished HTML to docs/dist/.
 *
 * Usage:
 *   bun run docs:build
 *   bun run docs:watch        (uses bun --watch to re-run on any file change)
 */

import { join, dirname, basename } from 'node:path'
import { mkdir, readdir, cp }      from 'node:fs/promises'
import { fileURLToPath }           from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = dirname(__filename)

const ROOT     = join(__dirname, '..')
const SRC      = join(ROOT, 'docs', 'src')
const DIST     = join(ROOT, 'dist')
const PAGES    = join(SRC, 'pages')
const ASSETS   = join(SRC, 'assets')
const TEMPLATE = join(SRC, 'templates', 'base.js')

// ─── Helpers ────────────────────────────────────────────────────────────────

function log(icon, msg) {
  process.stdout.write(`${icon}  ${msg}\n`)
}

function err(msg, cause) {
  process.stderr.write(`✗  ERROR: ${msg}\n`)
  if (cause) process.stderr.write(`   ${cause}\n`)
}

// ─── Build ──────────────────────────────────────────────────────────────────

const start = Date.now()
log('🛠', 'Building docs…')

// 1. Prepare output directory
await mkdir(DIST, { recursive: true })
await mkdir(join(DIST, 'assets'), { recursive: true })

// 2. Load the base template
const { renderPage } = await import(TEMPLATE)

// 3. Find all page files
const files = (await readdir(PAGES))
  .filter(f => f.endsWith('.js'))
  .sort()

if (!files.length) {
  err(`No page files found in ${PAGES}`)
  process.exit(1)
}

// 4. Render each page
let built = 0
for (const file of files) {
  const slug    = basename(file, '.js')
  const outFile = slug === 'index' ? 'index.html' : `${slug}.html`
  const outPath = join(DIST, outFile)

  try {
    const { page } = await import(join(PAGES, file))

    if (!page || typeof page !== 'object') {
      err(`${file} does not export a \`page\` object — skipping`)
      continue
    }

    const html = renderPage(page)
    await Bun.write(outPath, html)
    log('  ✓', `${outFile}  (${(html.length / 1024).toFixed(1)} kB)`)
    built++
  } catch (e) {
    err(`Failed to build ${file}`, e.message)
    process.exit(1)
  }
}

// 5. Copy static assets
const assetFiles = (await readdir(ASSETS)).filter(f => !f.endsWith('.map'))
for (const f of assetFiles) {
  await cp(join(ASSETS, f), join(DIST, 'assets', f))
}
log('  ✓', `Copied ${assetFiles.length} asset(s) to dist/assets/`)

// 6. Write a CNAME file if the env var is set (useful for custom domains)
const cname = process.env.DOCS_CNAME
if (cname) {
  await Bun.write(join(DIST, 'CNAME'), cname)
  log('  ✓', `CNAME → ${cname}`)
}

// 7. Write .nojekyll so GitHub Pages serves the site as-is
await Bun.write(join(DIST, '.nojekyll'), '')

log('🚀', `Built ${built} page(s) in ${Date.now() - start}ms → ${DIST}`)
