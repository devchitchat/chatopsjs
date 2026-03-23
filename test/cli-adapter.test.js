import { describe, expect, test } from 'bun:test'

import { Robot, Command, createTextResponse } from '../src/index.js'

function makeRobot() {
  const sent = []
  const robot = new Robot()
  robot.adapters.add({
    name: 'cli',
    async send(_envelope, message) { sent.push(message) }
  })
  return { robot, sent }
}

function envelope(text) {
  return { adapter: 'cli', type: 'message', text, actor: { id: 'cli-user', permissions: [] }, channel: { id: 'local-shell' } }
}

describe('cli adapter', () => {
  test('executes a command and delivers the response', async () => {
    const { robot, sent } = makeRobot()

    robot.commands.register(new Command({
      id: 'tickets.list',
      description: 'List tickets',
      handler: async () => createTextResponse('No tickets')
    }))

    const result = await robot.receive(envelope('tickets.list'))

    expect(result.ok).toBe(true)
    expect(sent[0].text).toBe('No tickets')
  })

  test('supports inline confirmation', async () => {
    const { robot, sent } = makeRobot()

    robot.commands.register(new Command({
      id: 'tickets.create',
      description: 'Create ticket',
      confirm: { mode: 'required', message: 'Create ticket?' },
      handler: async () => createTextResponse('Created ticket')
    }))

    const pending = await robot.receive(envelope('tickets.create'))
    expect(pending.ok).toBe(false)
    expect(sent[0].text).toContain('Create ticket?')

    await robot.receive(envelope('no'))
    expect(sent[1].text).toContain('Cancelled')

    await robot.receive(envelope('tickets.create'))
    expect(sent[2].text).toContain('Create ticket?')

    const confirmed = await robot.receive(envelope('yes'))
    expect(confirmed.ok).toBe(true)
    expect(sent[3].text).toBe('Created ticket')
  })
})
