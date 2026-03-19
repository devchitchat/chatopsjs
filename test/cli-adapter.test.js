import { describe, expect, test } from 'bun:test'

import {
  createCliApp,
  createCommand,
  createRuntime,
  createTextResponse
} from '../src/index.js'

describe('cli adapter', () => {
  test('handles help and command execution through line input', async () => {
    const runtime = createRuntime()

    runtime.registerCommand(createCommand({
      id: 'tickets.list',
      description: 'List tickets',
      execute: async () => createTextResponse('No tickets')
    }))

    const app = createCliApp({
      runtime,
      actor: {
        id: 'cli-user',
        permissions: []
      }
    })

    const help = await app.handleLine('help')
    const result = await app.handleLine('tickets.list')

    expect(help.ok).toBe(true)
    expect(help.output).toContain('tickets.list')
    expect(result.ok).toBe(true)
    expect(result.output).toBe('No tickets')
  })

  test('supports inline confirmation after a pending side effect', async () => {
    const runtime = createRuntime()

    runtime.registerCommand(createCommand({
      id: 'tickets.create',
      description: 'Create ticket',
      confirm: {
        mode: 'required',
        message: 'Create ticket?'
      },
      execute: async () => createTextResponse('Created ticket')
    }))

    const app = createCliApp({
      runtime,
      actor: {
        id: 'cli-user',
        permissions: []
      }
    })

    const pending = await app.handleLine('tickets.create')
    const denied = await app.handleLine('no')
    const pendingAgain = await app.handleLine('tickets.create')
    const confirmed = await app.handleLine('yes')

    expect(pending.ok).toBe(false)
    expect(pending.output).toContain('Create ticket?')
    expect(denied.ok).toBe(false)
    expect(denied.output).toContain('Cancelled')
    expect(pendingAgain.ok).toBe(false)
    expect(confirmed.ok).toBe(true)
    expect(confirmed.output).toBe('Created ticket')
  })
})
