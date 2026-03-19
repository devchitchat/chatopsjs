import { describe, expect, test } from 'bun:test'

import {
  loadAdapterModule,
  parseProgramArgs,
  resolveAdapterSpecifier
} from '../src/program.js'

describe('program args', () => {
  test('parses adapter module specifier from cli flags', () => {
    const args = parseProgramArgs(['--adapter', './examples/discord/app.js'])

    expect(args.adapter).toBe('./examples/discord/app.js')
    expect(args.adapterExplicit).toBe(true)
  })

  test('defaults to no external adapter module', () => {
    const args = parseProgramArgs([])

    expect(args.adapterExplicit).toBe(false)
    expect(resolveAdapterSpecifier(args)).toBeNull()
  })

  test('accepts short adapter flag', () => {
    const args = parseProgramArgs(['-a', '@chatopsjs/adapter-discord'])

    expect(resolveAdapterSpecifier(args)).toBe('@chatopsjs/adapter-discord')
    expect(args.adapterExplicit).toBe(true)
  })
})

describe('adapter module loading', () => {
  test('loads a module that exports runAdapterApp', async () => {
    const loaded = await loadAdapterModule('./fixtures/adapter-module.js', import.meta.url)

    expect(loaded.runAdapterApp).toBeFunction()
    expect(loaded.module.name).toBe('fixture-adapter')
  })

  test('rejects modules without the adapter app contract', async () => {
    await expect(
      loadAdapterModule('./fixtures/invalid-adapter-module.js', import.meta.url)
    ).rejects.toThrow(
      'Adapter module "./fixtures/invalid-adapter-module.js" must export "runAdapterApp" or a default function'
    )
  })
})
