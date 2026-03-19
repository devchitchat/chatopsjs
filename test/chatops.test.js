import { describe, expect, test } from 'bun:test'

import {
  createCommand,
  createRuntime,
  definePlugin,
  createTextResponse,
  createMessageResponse,
  createNativeResponse
} from '../src/index.js'

describe('chatops runtime', () => {
  test('executes a registered command through middleware with correlation and audit data', async () => {
    const events = []
    const runtime = createRuntime({
      logger: {
        info(entry) {
          events.push(entry)
        }
      }
    })

    runtime.use(async (ctx, next) => {
      ctx.state.trace = ['before']
      await next()
      ctx.state.trace.push('after')
    })

    runtime.registerCommand(createCommand({
      id: 'tickets.create',
      aliases: ['ticket.create'],
      description: 'Create a ticket',
      args: {
        title: {
          type: 'string',
          required: true
        }
      },
      permissions: ['tickets:write'],
      confirm: {
        mode: 'required',
        message: 'Create ticket?'
      },
      execute: async ctx => {
        return createMessageResponse({
          fallbackText: `Created ${ctx.args.title}`,
          blocks: [
            {
              type: 'section',
              text: `Created ${ctx.args.title}`
            }
          ]
        })
      }
    }))

    const denied = await runtime.handleEvent({
      adapter: 'cli',
      type: 'message',
      text: 'tickets.create --title "Broken login"',
      actor: {
        id: 'u-1',
        permissions: []
      },
      channel: {
        id: 'ops'
      }
    })

    expect(denied.ok).toBe(false)
    expect(denied.error.code).toBe('permission_denied')

    const pending = await runtime.handleEvent({
      adapter: 'cli',
      type: 'message',
      text: 'ticket.create --title "Broken login"',
      actor: {
        id: 'u-1',
        permissions: ['tickets:write']
      },
      channel: {
        id: 'ops'
      }
    })

    expect(pending.ok).toBe(false)
    expect(pending.error.code).toBe('confirmation_required')
    expect(pending.confirmation.commandId).toBe('tickets.create')
    expect(pending.meta.correlationId).toBeString()

    const confirmed = await runtime.handleEvent({
      adapter: 'cli',
      type: 'message',
      text: 'ticket.create --title "Broken login"',
      actor: {
        id: 'u-1',
        permissions: ['tickets:write']
      },
      channel: {
        id: 'ops'
      },
      confirmation: {
        approved: true
      }
    })

    expect(confirmed.ok).toBe(true)
    expect(confirmed.command.id).toBe('tickets.create')
    expect(confirmed.command.aliasUsed).toBe('ticket.create')
    expect(confirmed.context.state.trace).toEqual(['before', 'after'])
    expect(confirmed.response.message.blocks).toHaveLength(1)
    expect(events.some(entry => entry.event === 'command.completed')).toBe(true)
    expect(confirmed.audit[0]).toMatchObject({
      action: 'command.execute',
      commandId: 'tickets.create'
    })
  })

  test('returns safe help for unknown input', async () => {
    const runtime = createRuntime()

    const result = await runtime.handleEvent({
      adapter: 'cli',
      type: 'message',
      text: 'deploy prod now',
      actor: {
        id: 'u-2',
        permissions: []
      },
      channel: {
        id: 'ops'
      }
    })

    expect(result.ok).toBe(false)
    expect(result.error.code).toBe('unknown_command')
    expect(result.response.fallbackText).toContain('Unknown command')
  })

  test('renders native payloads only when adapter declares support', async () => {
    const runtime = createRuntime({
      adapters: [
        {
          name: 'slack',
          capabilities: {
            nativePayload: ['slack']
          }
        },
        {
          name: 'cli',
          capabilities: {
            nativePayload: []
          }
        }
      ]
    })

    runtime.registerCommand(createCommand({
      id: 'alerts.ack',
      description: 'Acknowledge an alert',
      execute: async () => {
        return createNativeResponse({
          fallbackText: 'Alert acknowledged',
          provider: 'slack',
          payload: {
            blocks: [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: '*Alert acknowledged*'
                }
              }
            ]
          }
        })
      }
    }))

    const slack = await runtime.handleEvent({
      adapter: 'slack',
      type: 'message',
      text: 'alerts.ack',
      actor: { id: 'u-3', permissions: [] },
      channel: { id: 'ops' }
    })

    const cli = await runtime.handleEvent({
      adapter: 'cli',
      type: 'message',
      text: 'alerts.ack',
      actor: { id: 'u-3', permissions: [] },
      channel: { id: 'ops' }
    })

    expect(slack.response.native.provider).toBe('slack')
    expect(cli.response.native).toBeNull()
    expect(cli.response.fallbackText).toBe('Alert acknowledged')
  })

  test('loads commands from plugins and exposes discovery metadata', async () => {
    const runtime = createRuntime()

    runtime.loadPlugin(definePlugin({
      name: 'tickets',
      version: '1.0.0',
      commands: [
        createCommand({
          id: 'tickets.list',
          description: 'List tickets',
          aliases: ['ticket.list'],
          execute: async () => createTextResponse('No tickets')
        })
      ]
    }))

    const catalog = runtime.getCommandCatalog()

    expect(catalog).toEqual([
      {
        id: 'tickets.list',
        aliases: ['ticket.list'],
        description: 'List tickets',
        permissions: []
      }
    ])
  })
})
