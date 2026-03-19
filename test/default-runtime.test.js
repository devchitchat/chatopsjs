import { describe, expect, test } from 'bun:test'

import { createDefaultRuntime } from '../src/default-runtime.js'

describe('default runtime', () => {
  test('autoloads modules from the modules directory', async () => {
    const runtime = await createDefaultRuntime({
      modulesDirectory: '../test/fixtures/modules',
      baseUrl: import.meta.url
    })

    expect(runtime.getCommandCatalog()).toEqual([
      {
        id: 'help.commands',
        aliases: ['commands.list'],
        description: 'List a portable command summary',
        permissions: []
      },
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
})
