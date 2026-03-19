import { describe, expect, test } from 'bun:test'

import { createRuntime } from '../src/index.js'
import { loadModules } from '../src/module-loader.js'

describe('module loader', () => {
  test('loads command and plugin modules from a modules directory', async () => {
    const runtime = createRuntime()

    await loadModules({
      runtime,
      directory: './fixtures/modules',
      baseUrl: import.meta.url
    })

    const catalog = runtime.getCommandCatalog()

    expect(catalog).toEqual([
      {
        id: 'alerts.ack',
        aliases: [],
        description: 'Acknowledge an alert',
        permissions: []
      },
      {
        id: 'tickets.list',
        aliases: ['ticket.list'],
        description: 'List tickets',
        permissions: []
      }
    ])
  })

  test('ignores non-javascript files', async () => {
    const runtime = createRuntime()

    await loadModules({
      runtime,
      directory: './fixtures/modules-with-noise',
      baseUrl: import.meta.url
    })

    expect(runtime.getCommandCatalog()).toEqual([
      {
        id: 'tickets.list',
        aliases: [],
        description: 'List tickets',
        permissions: []
      }
    ])
  })

  test('treats a missing modules directory as empty', async () => {
    const runtime = createRuntime()

    await loadModules({
      runtime,
      directory: './fixtures/missing-modules',
      baseUrl: import.meta.url
    })

    expect(runtime.getCommandCatalog()).toEqual([])
  })
})
