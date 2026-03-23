import { describe, expect, test } from 'bun:test'

import { Robot, Command, createTextResponse, createMessageResponse, createNativeResponse } from '../src/index.js'

describe('chatops robot', () => {
  test('executes a command through middleware with correlation metadata', async () => {
    const events = []
    const robot = new Robot({
      logger: { info(entry) { events.push(entry) } }
    })

    robot.use(async (ctx, next) => {
      ctx.state.trace = ['before']
      await next()
      ctx.state.trace.push('after')
    })

    robot.commands.register(new Command({
      id: 'tickets.create',
      aliases: ['ticket.create'],
      description: 'Create a ticket',
      args: { title: { type: 'string', required: true } },
      permissions: ['tickets:write'],
      confirm: { mode: 'required', message: 'Create ticket?' },
      handler: async ctx => createMessageResponse({
        fallbackText: `Created ${ctx.args.title}`,
        blocks: [{ type: 'section', text: `Created ${ctx.args.title}` }]
      })
    }))

    const denied = await robot.receive({
      adapter: 'cli', type: 'message',
      text: 'tickets.create --title "Broken login"',
      actor: { id: 'u-1', permissions: [] },
      channel: { id: 'ops' }
    })

    expect(denied.ok).toBe(false)
    expect(denied.error.code).toBe('permission_denied')

    const pending = await robot.receive({
      adapter: 'cli', type: 'message',
      text: 'ticket.create --title "Broken login"',
      actor: { id: 'u-1', permissions: ['tickets:write'] },
      channel: { id: 'ops' }
    })

    expect(pending.ok).toBe(false)
    expect(pending.error.code).toBe('confirmation_required')
    expect(pending.confirmation.commandId).toBe('tickets.create')
    expect(pending.meta.correlationId).toBeString()

    const confirmed = await robot.receive({
      adapter: 'cli', type: 'message',
      text: 'yes',
      actor: { id: 'u-1', permissions: ['tickets:write'] },
      channel: { id: 'ops' }
    })

    expect(confirmed.ok).toBe(true)
    expect(confirmed.command.id).toBe('tickets.create')
    expect(confirmed.command.aliasUsed).toBe('ticket.create')
    expect(confirmed.context.state.trace).toEqual(['before', 'after'])
    expect(confirmed.response.blocks).toHaveLength(1)
    expect(events.some(entry => entry.event === 'command.completed')).toBe(true)
  })

  test('returns an error for unknown input', async () => {
    const robot = new Robot()

    const result = await robot.receive({
      adapter: 'cli', type: 'message',
      text: 'deploy prod now',
      actor: { id: 'u-2', permissions: [] },
      channel: { id: 'ops' }
    })

    expect(result.ok).toBe(false)
    expect(result.error.code).toBe('unknown_command')
    expect(result.response.text).toContain('Unknown command')
  })

  test('returns a native response for the calling adapter', async () => {
    const robot = new Robot()

    robot.commands.register(new Command({
      id: 'alerts.ack',
      description: 'Acknowledge an alert',
      handler: async () => createNativeResponse({
        fallbackText: 'Alert acknowledged',
        provider: 'slack',
        payload: { blocks: [{ type: 'section', text: { type: 'mrkdwn', text: '*Alert acknowledged*' } }] }
      })
    }))

    const result = await robot.receive({
      adapter: 'slack', type: 'message',
      text: 'alerts.ack',
      actor: { id: 'u-3', permissions: [] },
      channel: { id: 'ops' }
    })

    expect(result.ok).toBe(true)
    expect(result.response.native.provider).toBe('slack')
    expect(result.response.text).toBe('Alert acknowledged')
  })

  test('registers commands via robot.commands.register', async () => {
    const robot = new Robot()

    robot.commands.register(new Command({
      id: 'tickets.list',
      description: 'List tickets',
      aliases: ['ticket.list'],
      handler: async () => createTextResponse('No tickets')
    }))

    const ids = robot.commands.list().map(c => c.id)
    expect(ids).toContain('tickets.list')

    const result = await robot.receive({
      adapter: 'cli', type: 'message',
      text: 'ticket.list',
      actor: { id: 'u-4', permissions: [] },
      channel: { id: 'ops' }
    })

    expect(result.ok).toBe(true)
    expect(result.response.text).toBe('No tickets')
  })
})
