import { describe, expect, test } from 'bun:test'
import { Robot } from '../src/index.js'

describe('Robot.create', () => {
  test('registers help.commands and autoloads modules', async () => {
    const robot = await Robot.create({
      directory: '../test/fixtures/modules',
      baseUrl: import.meta.url
    })

    const ids = robot.commands.list().map(c => c.id)
    expect(ids).toContain('help.commands')
    expect(ids).toContain('alerts.ack')
    expect(ids).toContain('tickets.list')
  })
})
