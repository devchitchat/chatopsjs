import { describe, expect, test } from 'bun:test'
import { Robot } from '../src/index.js'

describe('module loader', () => {
  test('loads modules from a modules directory', async () => {
    const robot = new Robot()
    await robot.loadModules({ directory: './fixtures/modules', baseUrl: import.meta.url })
    const ids = robot.commands.list().map(c => c.id)
    expect(ids).toContain('alerts.ack')
    expect(ids).toContain('tickets.list')
  })

  test('ignores non-javascript files', async () => {
    const robot = new Robot()
    await robot.loadModules({ directory: './fixtures/modules-with-noise', baseUrl: import.meta.url })
    const ids = robot.commands.list().map(c => c.id)
    expect(ids).toEqual(['tickets.list'])
  })

  test('treats a missing modules directory as empty', async () => {
    const robot = new Robot()
    await robot.loadModules({ directory: './fixtures/missing-modules', baseUrl: import.meta.url })
    expect(robot.commands.list()).toEqual([])
  })
})
